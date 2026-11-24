/** Paths a sign-in may return to. Anything else is ignored so this cannot be an open redirect. */
const ALLOWED = new Set(["/delete-account"]);

export const AFTER_LOGIN_KEY = "ff-after-login";

export function rememberAfterLogin(path: string) {
  if (typeof window === "undefined" || !ALLOWED.has(path)) return;
  try {
    window.sessionStorage.setItem(AFTER_LOGIN_KEY, path);
  } catch {
    /* private mode */
  }
}

export function afterLoginPath(fallback: "/" | "/delete-account" = "/"): "/" | "/delete-account" {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.sessionStorage.getItem(AFTER_LOGIN_KEY);
    if (value === "/delete-account") return value;
  } catch {
    /* private mode */
  }
  return fallback;
}

export function clearAfterLogin() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AFTER_LOGIN_KEY);
  } catch {
    /* private mode */
  }
}
