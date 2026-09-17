export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export async function getDeviceLocation(): Promise<{ lat: number; lng: number }> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12_000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      /* fall through */
    }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Could not read your location.")),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 },
    );
  });
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
    /* web preview */
  }
}
