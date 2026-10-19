/**
 * Browser token store for Auth0 BFF password sessions.
 * Access token in memory; refresh token in localStorage (same habit as Auth0 SPA).
 */

const REFRESH_KEY = "ims.v5.auth.refreshToken";
const EXPIRES_AT_KEY = "ims.v5.auth.expiresAt";

export type StoredSession = {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms when the access token should be treated as expired. */
  expiresAt: number;
};

let memoryAccessToken: string | null = null;
let memoryExpiresAt = 0;
let memoryRefreshToken: string | null = null;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

export function getStoredSession(): StoredSession | null {
  const accessToken = memoryAccessToken;
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: memoryRefreshToken ?? readStorage(REFRESH_KEY),
    expiresAt: memoryExpiresAt,
  };
}

export function setStoredSession(session: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
}): void {
  memoryAccessToken = session.accessToken;
  memoryExpiresAt = Date.now() + Math.max(0, session.expiresIn - 30) * 1000;
  writeStorage(EXPIRES_AT_KEY, String(memoryExpiresAt));

  if (session.refreshToken !== undefined) {
    memoryRefreshToken = session.refreshToken;
    writeStorage(REFRESH_KEY, session.refreshToken);
  } else if (!memoryRefreshToken) {
    memoryRefreshToken = readStorage(REFRESH_KEY);
  }
}

export function clearStoredSession(): void {
  memoryAccessToken = null;
  memoryExpiresAt = 0;
  memoryRefreshToken = null;
  writeStorage(REFRESH_KEY, null);
  writeStorage(EXPIRES_AT_KEY, null);
}

export function getRefreshToken(): string | null {
  return memoryRefreshToken ?? readStorage(REFRESH_KEY);
}

export function isAccessTokenExpired(skewMs = 0): boolean {
  if (!memoryAccessToken) return true;
  return Date.now() + skewMs >= memoryExpiresAt;
}

/**
 * Hydrate in-memory access token after a full page reload.
 * Access tokens are not persisted; only refresh tokens are.
 * Callers should refresh when memory is empty but a refresh token exists.
 */
export function hasRefreshTokenPersisted(): boolean {
  return Boolean(getRefreshToken());
}
