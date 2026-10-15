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

function browserPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    const ok = (pos: GeolocationPosition) =>
      resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    const fail = () => reject(new Error("Could not read your location."));
    const coarse = () =>
      navigator.geolocation.getCurrentPosition(ok, fail, {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 120_000,
      });
    navigator.geolocation.getCurrentPosition(ok, coarse, {
      enableHighAccuracy: true,
      timeout: 3500,
      maximumAge: 30_000,
    });
  });
}

export async function getDeviceLocation(): Promise<{ lat: number; lng: number }> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.requestPermissions();
      const granted = perm.location === "granted" || perm.coarseLocation === "granted";
      if (!granted) {
        throw new Error("Location permission denied");
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      /* fall through to browser geolocation */
    }
  }
  return browserPosition();
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
