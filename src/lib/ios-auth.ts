/** Custom scheme the iOS app registers. ASWebAuthenticationSession completes on it. */
export const IOS_AUTH_SCHEME = "flushfinder";

/** Same cookie Better Auth issues. Kept here so the iOS handoff does not import the server. */
export const IOS_SESSION_COOKIE = "__Host-grok-auth.session_token";

/** Where the OAuth browser lands so we can hand the session to the app. */
export const IOS_AUTH_DONE_PATH = "/auth/ios-done";

export function readCookieValue(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    const raw = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

/** Location the system browser should hit when sign-in finishes. Never an https page inside the WebView. */
export function iosAuthLocation(cookieHeader: string | null | undefined, failed: boolean): string {
  if (failed) return `${IOS_AUTH_SCHEME}://auth?error=1`;
  const token = readCookieValue(cookieHeader, IOS_SESSION_COOKIE);
  if (!token) return `${IOS_AUTH_SCHEME}://auth?error=missing`;
  return `${IOS_AUTH_SCHEME}://auth?token=${encodeURIComponent(token)}`;
}

export function parseNativeAuthCallback(url: string): { token: string | null; error: string | null } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { token: null, error: "bad-url" };
  }
  if (parsed.protocol !== `${IOS_AUTH_SCHEME}:`) return { token: null, error: "bad-scheme" };
  const error = parsed.searchParams.get("error");
  const token = parsed.searchParams.get("token");
  if (error) return { token: null, error };
  if (!token) return { token: null, error: "missing" };
  return { token, error: null };
}
