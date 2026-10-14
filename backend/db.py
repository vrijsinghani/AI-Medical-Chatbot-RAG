import os
import sqlite3

# Vercel can only write to /tmp, which is wiped on restart. Set DB_PATH locally to keep data.
DB_NAME = os.getenv("DB_PATH", "/tmp/medical_data.db")

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn
