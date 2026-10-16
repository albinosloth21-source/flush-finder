/** Turn-by-turn handoff to the user's maps app. No location needed: the app picks the start. */
export type NavApp = "google" | "apple" | "waze";

export const NAV_APPS: { id: NavApp; label: string }[] = [
  { id: "apple", label: "Apple Maps" },
  { id: "google", label: "Google Maps" },
  { id: "waze", label: "Waze" },
];

const NAV_KEY = "ff.navApp";

function coord(n: number): string {
  return (Math.round(n * 1e6) / 1e6).toString();
}

export function navUrl(app: NavApp, dest: { lat: number; lng: number }): string {
  const ll = `${coord(dest.lat)},${coord(dest.lng)}`;
  if (app === "apple") return `https://maps.apple.com/?daddr=${ll}`;
  if (app === "waze") return `https://waze.com/ul?ll=${ll}&navigate=yes`;
  return `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
}

/** iPhone/iPad (including iPadOS that reports as Mac with touch) -> Apple Maps, everything else -> Google. */
export function platformNavApp(ua: string, touchPoints = 0): NavApp {
  if (/iPhone|iPad|iPod/i.test(ua)) return "apple";
  if (/Macintosh/i.test(ua) && touchPoints > 1) return "apple";
  return "google";
}

export function defaultNavApp(): NavApp {
  if (typeof window === "undefined") return "google";
  try {
    const saved = window.localStorage.getItem(NAV_KEY);
    if (saved === "google" || saved === "apple" || saved === "waze") return saved;
  } catch {
    /* storage blocked */
  }
  return platformNavApp(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}

export function rememberNavApp(app: NavApp) {
  try {
    window.localStorage.setItem(NAV_KEY, app);
  } catch {
    /* storage blocked */
  }
}

export function openNav(app: NavApp, dest: { lat: number; lng: number }) {
  rememberNavApp(app);
  window.open(navUrl(app, dest), "_blank", "noopener,noreferrer");
}
