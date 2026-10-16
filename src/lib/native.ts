import {
  classifyGeolocationError,
  detectInAppBrowser,
  isAppleDevice,
  isLocationError,
  LocationError,
  locationHelp,
  MANUAL_SPOT_KEY,
  parseManualSpot,
  preflightLocation,
  serializeManualSpot,
  type LocationContext,
  type LocationHelp,
  type ManualSpot,
} from "@/lib/location";

export { LocationError, isLocationError, type LocationHelp };

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export type LocationPermission = "granted" | "denied" | "prompt" | "unknown";

export async function readLocationPermission(): Promise<LocationPermission> {
  if (typeof navigator === "undefined") return "unknown";
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location === "granted" || perm.coarseLocation === "granted") return "granted";
      if (perm.location === "denied" || perm.coarseLocation === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }
  try {
    const perms = navigator.permissions;
    if (!perms?.query) return "unknown";
    const status = await perms.query({ name: "geolocation" as PermissionName });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
  } catch {
    /* Safari and some WebViews throw on geolocation permission queries. */
  }
  return "unknown";
}

function locationContext(): LocationContext {
  let framed = false;
  try {
    framed = window.self !== window.top;
  } catch {
    framed = true;
  }
  return { secure: window.isSecureContext !== false, framed, native: isNativeApp() };
}

/** True when the app runs inside another page's iframe (e.g. a preview link). */
export function isFramed(): boolean {
  return typeof window !== "undefined" && locationContext().framed;
}

/**
 * getCurrentPosition with a hard watchdog: some iOS/Android webviews never call back at all.
 * Note iOS Safari starts the `timeout` clock while its permission prompt is still on screen,
 * so timeouts must be long enough for a person to read and tap "Allow".
 */
function webPosition(opts: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let done = false;
    const guard = window.setTimeout(() => {
      if (done) return;
      done = true;
      reject({ code: 3, message: "watchdog timeout" });
    }, (opts.timeout ?? 15_000) + 5_000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return;
        done = true;
        window.clearTimeout(guard);
        resolve(pos);
      },
      (err) => {
        if (done) return;
        done = true;
        window.clearTimeout(guard);
        reject(err);
      },
      opts,
    );
  });
}

/** Web location timing (exported for tests). Coarse first: Wi-Fi/cell answers in ~1s, cold GPS can take 10s+. */
export const WEB_LOCATION_COARSE: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 };
export const WEB_LOCATION_WATCH: PositionOptions = { enableHighAccuracy: true, timeout: 30_000, maximumAge: 60_000 };
export const WEB_LOCATION_WATCH_MS = 30_000;

/** Keep listening (watchPosition) until the first fix of any accuracy arrives, up to WEB_LOCATION_WATCH_MS. */
function watchFirstPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let id: number | null = null;
    let lastErr: unknown = { code: 3, message: "watch timeout" };
    const stop = () => {
      if (id != null) navigator.geolocation.clearWatch(id);
      window.clearTimeout(guard);
    };
    const guard = window.setTimeout(() => {
      stop();
      reject(lastErr);
    }, WEB_LOCATION_WATCH_MS);
    id = navigator.geolocation.watchPosition(
      (pos) => {
        stop();
        resolve(pos);
      },
      (err) => {
        lastErr = err;
        // Denied will not change; timeouts / unavailable keep waiting for the next update.
        if (err?.code === 1) {
          stop();
          reject(err);
        }
      },
      WEB_LOCATION_WATCH,
    );
  });
}

async function browserPosition(): Promise<{ lat: number; lng: number }> {
  const ctx = locationContext();
  const pre = preflightLocation({ ...ctx, native: false, hasGeolocation: Boolean(navigator.geolocation) });
  if (pre) throw pre;
  try {
    const pos = await webPosition(WEB_LOCATION_COARSE).catch((first: GeolocationPositionError) => {
      // A denial will not change on retry; on timeout / unavailable keep listening instead of failing.
      if (first?.code === 1) throw first;
      return watchFirstPosition();
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (err) {
    throw classifyGeolocationError(err, ctx);
  }
}

export async function getDeviceLocation(): Promise<{ lat: number; lng: number }> {
  if (isNativeApp()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    let granted = false;
    try {
      const perm = await Geolocation.requestPermissions();
      granted = perm.location === "granted" || perm.coarseLocation === "granted";
    } catch (err) {
      // Location services switched off device-wide reject here.
      throw new LocationError("unavailable", "Location services are off on this device.", err);
    }
    if (!granted) throw new LocationError("denied", "Location permission is off for Flush Finder.");
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8_000 }).catch(() =>
        Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8_000, maximumAge: 120_000 }),
      );
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      const msg = String((err as { message?: unknown })?.message ?? "").toLowerCase();
      if (msg.includes("timeout")) throw new LocationError("timeout", "Couldn't get a location fix in time.", err);
      throw new LocationError("unavailable", "Your location isn't available right now.", err);
    }
  }
  return browserPosition();
}

/** Open the current page as a top-level tab (escapes preview iframes). */
export function openInNewTab() {
  if (typeof window === "undefined") return;
  window.open(window.location.href, "_blank", "noopener");
}

export function readManualSpot(): ManualSpot | null {
  if (typeof window === "undefined") return null;
  try {
    return parseManualSpot(window.localStorage.getItem(MANUAL_SPOT_KEY));
  } catch {
    return null;
  }
}

export function writeManualSpot(lat: number, lng: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MANUAL_SPOT_KEY, serializeManualSpot(lat, lng));
  } catch {
    /* private mode */
  }
}

export function locationHelpFor(err: unknown): LocationHelp {
  const code = isLocationError(err) ? err.code : "unavailable";
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return locationHelp(code, { native: isNativeApp(), inAppBrowser: detectInAppBrowser(ua), apple: isAppleDevice(ua) });
}

export async function prepareNativeShell() {
  if (!isNativeApp()) return;
  try {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
    ]);
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#1e4f4a" }).catch(() => undefined);
    await SplashScreen.hide();
  } catch {
    /* web preview has no native plugins */
  }
}
