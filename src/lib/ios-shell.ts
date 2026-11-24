/**
 * Bridge to the Flush Finder iOS app (WKWebView + native services).
 * The page stays the web app. Location, maps, share, haptics, and OAuth
 * are handled by the app so sign-in is not an embedded WebView.
 */

type BridgeResult = Record<string, unknown>;

type Pending = {
  resolve: (value: BridgeResult) => void;
  reject: (error: Error) => void;
};

const pending = new Map<string, Pending>();

type FlushWindow = Window & {
  flushFinderIOS?: boolean;
  __flushFinderResolve?: (id: string, value: BridgeResult) => void;
  __flushFinderReject?: (id: string, message: string) => void;
  webkit?: { messageHandlers?: { flushFinder?: { postMessage: (body: unknown) => void } } };
};

function shellWindow(): FlushWindow | null {
  if (typeof window === "undefined") return null;
  return window as FlushWindow;
}

export function installFlushFinderIOSBridge() {
  const w = shellWindow();
  if (!w) return;
  w.__flushFinderResolve = (id, value) => {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id);
    item.resolve(value ?? {});
  };
  w.__flushFinderReject = (id, message) => {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id);
    item.reject(new Error(message || "The iPhone couldn't finish that."));
  };
}

export function isFlushFinderIOSApp(): boolean {
  const w = shellWindow();
  if (!w) return false;
  return w.flushFinderIOS === true || Boolean(w.webkit?.messageHandlers?.flushFinder);
}

function iosCall(action: string, payload: Record<string, unknown> = {}): Promise<BridgeResult> {
  const w = shellWindow();
  const handler = w?.webkit?.messageHandlers?.flushFinder;
  if (!w || !handler) return Promise.reject(new Error("Open Flush Finder in the iPhone app to do that."));
  installFlushFinderIOSBridge();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ios-${Date.now()}`;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      reject(new Error("The iPhone didn't answer."));
    }, 180_000);
    pending.set(id, {
      resolve: (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    });
    handler.postMessage({ id, action, ...payload });
  });
}

export async function iosDeviceLocation(): Promise<{ lat: number; lng: number }> {
  const result = await iosCall("location");
  const lat = Number(result.lat);
  const lng = Number(result.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Your location isn't available right now.");
  return { lat, lng };
}

export function iosOpenDirections(dest: { lat: number; lng: number; name?: string; app?: string }) {
  void iosCall("directions", {
    lat: dest.lat,
    lng: dest.lng,
    name: dest.name ?? "",
    app: dest.app ?? "apple",
  }).catch(() => undefined);
}

export function iosSharePlace(payload: { title: string; text: string; url: string }) {
  return iosCall("share", payload);
}

export function iosHaptic(kind: "light" | "medium" | "success" | "warning" = "light") {
  if (!isFlushFinderIOSApp()) return;
  void iosCall("haptic", { kind }).catch(() => undefined);
}

/** System browser (ASWebAuthenticationSession). Returns the session bearer, never a WebView redirect. */
export async function iosStartAuth(url: string): Promise<string> {
  const result = await iosCall("auth", { url });
  const token = typeof result.token === "string" ? result.token : "";
  if (!token) throw new Error("Sign-in was cancelled");
  return token;
}

/** Native Sign in with Apple. The app posts the Apple identity token to the server. */
export async function iosSignInWithApple(): Promise<string> {
  const result = await iosCall("apple");
  const token = typeof result.token === "string" ? result.token : "";
  if (!token) throw new Error("Sign in with Apple didn't return a session.");
  return token;
}

if (typeof window !== "undefined") installFlushFinderIOSBridge();
