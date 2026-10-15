/** Session bearer key used by Better Auth in the live preview / native shell. */
export const AUTH_BEARER_KEY = "grok-auth.bearer-token";

export type TokenStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function safeGet(store: TokenStore | null | undefined, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(store: TokenStore | null | undefined, key: string, value: string | null): void {
  if (!store) return;
  try {
    if (value) store.setItem(key, value);
    else store.removeItem(key);
  } catch {
    /* private mode / quota */
  }
}

/**
 * Prefer localStorage so closing the app does not sign the user out.
 * Migrate any leftover sessionStorage token once.
 */
export function readPersistedBearer(stores: {
  local?: TokenStore | null;
  session?: TokenStore | null;
}): string | null {
  const fromLocal = safeGet(stores.local, AUTH_BEARER_KEY);
  if (fromLocal) return fromLocal;
  const fromSession = safeGet(stores.session, AUTH_BEARER_KEY);
  if (fromSession) {
    safeWrite(stores.local, AUTH_BEARER_KEY, fromSession);
    return fromSession;
  }
  return null;
}

export function writePersistedBearer(
  token: string | null,
  stores: { local?: TokenStore | null; session?: TokenStore | null },
): void {
  safeWrite(stores.local, AUTH_BEARER_KEY, token);
  safeWrite(stores.session, AUTH_BEARER_KEY, token);
}

export function browserTokenStores(): { local: TokenStore | null; session: TokenStore | null } {
  if (typeof window === "undefined") return { local: null, session: null };
  try {
    return { local: window.localStorage, session: window.sessionStorage };
  } catch {
    return { local: null, session: null };
  }
}

export function sessionSurvivesAppClose(token: string | null, afterRelaunch: string | null): boolean {
  return Boolean(token) && token === afterRelaunch;
}
