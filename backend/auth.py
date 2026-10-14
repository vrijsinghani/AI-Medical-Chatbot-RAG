import hashlib
import hmac
import re
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from db import get_db

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]{3,32}$")
MIN_PASSWORD_LENGTH = 8

router = APIRouter(prefix="/api/auth")


def init_auth_tables(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY, password_hash TEXT NOT NULL, salt TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)""")


def _hash_password(password: str, salt: bytes) -> str:
    return hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _start_session(conn, username: str) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions (token_hash, username) VALUES (?, ?)", (_hash_token(token), username))
    return token


def current_user(authorization: str = Header(default="")) -> str:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Not logged in.")
    conn = get_db()
    row = conn.execute("SELECT username FROM sessions WHERE token_hash = ?", (_hash_token(token),)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return row["username"]


class Credentials(BaseModel):
    username: str
    password: str
    name: str = ""


@router.post("/register")
def register(data: Credentials):
    username = data.username.strip().lower()
    if not USERNAME_PATTERN.match(username):
        raise HTTPException(status_code=400, detail="Username must be 3-32 letters, numbers, dots, dashes or underscores.")
    if len(data.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

    salt = secrets.token_bytes(16)
    conn = get_db()
    try:
        if conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
            raise HTTPException(status_code=409, detail="This username is taken.")
        conn.execute("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
                     (username, _hash_password(data.password, salt), salt.hex()))
        conn.execute("INSERT INTO user_profiles (email, name) VALUES (?, ?) ON CONFLICT(email) DO NOTHING",
                     (username, data.name.strip() or "Patient"))
        token = _start_session(conn, username)
        conn.commit()
    finally:
        conn.close()
    return {"token": token, "username": username}


@router.post("/login")
def login(data: Credentials):
    username = data.username.strip().lower()
    conn = get_db()
    try:
        user = conn.execute("SELECT password_hash, salt FROM users WHERE username = ?", (username,)).fetchone()
        password_ok = user and hmac.compare_digest(
            user["password_hash"], _hash_password(data.password, bytes.fromhex(user["salt"]))
        )
        if not password_ok:
            raise HTTPException(status_code=401, detail="Invalid username or password.")
        token = _start_session(conn, username)
        conn.commit()
    finally:
        conn.close()
    return {"token": token, "username": username}


@router.post("/logout")
def logout(authorization: str = Header(default=""), username: str = Depends(current_user)):
    token = authorization.partition(" ")[2]
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash_token(token),))
    conn.commit()
    conn.close()
    return {"status": "success"}


@router.get("/me")
def me(username: str = Depends(current_user)):
    return {"username": username}
