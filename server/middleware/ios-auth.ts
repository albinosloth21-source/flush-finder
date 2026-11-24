/**
 * Last hop of iOS sign-in. The system browser (not the WebView) lands here
 * with the session cookie, then we bounce to flushfinder:// so
 * ASWebAuthenticationSession can hand the token to the app.
 */
import { IOS_AUTH_DONE_PATH, iosAuthLocation } from "../../src/lib/ios-auth.ts";

interface IosAuthEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

export default function iosAuthMiddleware(event: IosAuthEvent, next: () => unknown): unknown {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" || event.url.pathname !== IOS_AUTH_DONE_PATH) return next();
  const failed = event.url.searchParams.has("error");
  const location = iosAuthLocation(event.req.headers.get("cookie"), failed);
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
    },
  });
}
