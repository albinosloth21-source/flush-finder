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

function webPosition(opts: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));
}

async function browserPosition(): Promise<{ lat: number; lng: number }> {
  const ctx = locationContext();
  const pre = preflightLocation({ ...ctx, native: false, hasGeolocation: Boolean(navigator.geolocation) });
  if (pre) throw pre;
  try {
    const pos = await webPosition({ enableHighAccuracy: true, timeout: 3500, maximumAge: 30_000 }).catch(
      (first: GeolocationPositionError) => {
        // A denial will not change on retry; only retry timeouts / unavailable.
        if (first?.code === 1) throw first;
        return webPosition({ enableHighAccuracy: false, timeout: 6000, maximumAge: 120_000 });
      },
    );
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
