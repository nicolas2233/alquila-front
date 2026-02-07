export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  agencyId?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
};

const TOKEN_KEY = "alquila_token";
const USER_KEY = "alquila_user";

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRoleFromToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    const json = JSON.parse(decoded) as { role?: string };
    return json.role ?? null;
  } catch {
    return null;
  }
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
