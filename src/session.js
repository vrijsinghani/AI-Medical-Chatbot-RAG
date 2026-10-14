const TOKEN_KEY = 'aiMedicalToken';
const USERNAME_KEY = 'aiMedicalUsername';
const TAB_SESSION_KEY = 'aiMedicalSessionActive';

export const getUsername = () => localStorage.getItem(USERNAME_KEY) || '';
export const isLoggedIn = () => Boolean(localStorage.getItem(TOKEN_KEY));

// sessionStorage is per tab, so this returns true once for each new tab.
export function claimTabSession() {
  const isNewTab = !sessionStorage.getItem(TAB_SESSION_KEY);
  sessionStorage.setItem(TAB_SESSION_KEY, 'true');
  return isNewTab;
}

export function startSession({ token, username }) {
  clearSession();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  sessionStorage.setItem(TAB_SESSION_KEY, 'true');
}

// Removes every app key except the theme, so the next user starts clean.
export function clearSession() {
  const theme = localStorage.getItem('aiMedicalTheme');
  Object.keys(localStorage)
    .filter((key) => key.startsWith('aiMedical'))
    .forEach((key) => localStorage.removeItem(key));
  if (theme) localStorage.setItem('aiMedicalTheme', theme);
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...options,
    headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (response.status === 401) {
    clearSession();
    window.location.assign('/login');
  }
  return response;
}

export async function logout() {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  clearSession();
}
