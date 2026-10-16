/**
 * Location failures, classified so the UI can say *why* and offer the right fix.
 * Pure helpers (no window access) so they are unit-testable; browser glue lives
 * in `native.ts`.
 */

export type LocationErrorCode =
  | "insecure"
  | "framed"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export class LocationError extends Error {
  readonly code: LocationErrorCode;
  /** The original browser / plugin error, kept for debugging. */
  readonly cause?: unknown;
  constructor(code: LocationErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "LocationError";
    this.code = code;
    this.cause = cause;
  }
}

export function isLocationError(value: unknown): value is LocationError {
  return value instanceof LocationError;
}

export type LocationContext = {
  /** window.isSecureContext */
  secure: boolean;
  /** Running inside an iframe (e.g. the Grok Build preview). */
  framed: boolean;
  /** Running inside the Capacitor Android / iOS shell. */
  native: boolean;
};

/** GeolocationPositionError codes: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT. */
export function classifyGeolocationError(err: unknown, ctx: LocationContext): LocationError {
  if (err instanceof LocationError) return err;
  const code = typeof (err as { code?: unknown })?.code === "number" ? (err as { code: number }).code : 0;
  if (code === 1) {
    // Inside a cross-origin iframe without allow="geolocation" the browser
    // denies instantly without a prompt; report that separately.
    return ctx.framed
      ? new LocationError("framed", "Location is blocked inside this preview.", err)
      : new LocationError("denied", "Location permission is off.", err);
  }
  if (code === 3) return new LocationError("timeout", "Couldn't get a location fix in time.", err);
  return new LocationError("unavailable", "Your location isn't available right now.", err);
}

/** Problems we can detect before asking the browser at all. */
export function preflightLocation(
  ctx: LocationContext & { hasGeolocation: boolean },
): LocationError | null {
  if (ctx.native) return null;
  if (!ctx.secure) return new LocationError("insecure", "Location needs a secure (https) link.");
  if (!ctx.hasGeolocation) return new LocationError("unsupported", "This browser can't share location.");
  return null;
}

/** Social-app webviews that commonly block or never show the location prompt. */
export function detectInAppBrowser(userAgent: string): string | null {
  const ua = userAgent || "";
  const known: Array<[RegExp, string]> = [
    [/FBAN|FBAV|FB_IAB/i, "Facebook"],
    [/Instagram/i, "Instagram"],
    [/Messenger/i, "Messenger"],
    [/Twitter|TwitterAndroid/i, "X"],
    [/Discord/i, "Discord"],
    [/Snapchat/i, "Snapchat"],
    [/TikTok|musical_ly|BytedanceWebview/i, "TikTok"],
    [/Line\//i, "LINE"],
    [/LinkedInApp/i, "LinkedIn"],
    [/GSA\//i, "Google app"],
  ];
  for (const [re, name] of known) if (re.test(ua)) return name;
  return null;
}

export function isAppleDevice(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Macintosh/i.test(userAgent || "");
}

export type LocationAction = "open-tab" | "retry" | "tap-map" | "search";

export type LocationHelp = {
  title: string;
  message: string;
  actions: LocationAction[];
};

/** Copy and fallback buttons for each failure. */
export function locationHelp(
  code: LocationErrorCode,
  env: { native: boolean; inAppBrowser: string | null; apple: boolean },
): LocationHelp {
  const fallbacks: LocationAction[] = ["tap-map", "search"];
  const browser = env.apple ? "Safari" : "Chrome";
  if (env.inAppBrowser && !env.native && code !== "insecure") {
    // Links opened inside X, Instagram, Discord, etc. use that app's location permission,
    // which is often off: the browser then times out or denies with no prompt.
    return {
      title: "Open in your browser",
      message: `${env.inAppBrowser}'s built-in browser often blocks location. Use the ••• menu to open Flush Finder in ${browser}, or set your spot by hand.`,
      actions: code === "timeout" || code === "unavailable" ? ["retry", ...fallbacks] : fallbacks,
    };
  }
  switch (code) {
    case "framed":
      return {
        title: "Location is blocked in this preview",
        message: "This preview window can't ask for your location. Open Flush Finder in its own tab, or set your spot by hand.",
        actions: ["open-tab", ...fallbacks],
      };
    case "denied":
      return env.native
        ? {
            title: "Location is off for Flush Finder",
            message: env.apple
              ? "Turn it on in Settings → Privacy & Security → Location Services → Flush Finder, then try again."
              : "Turn it on in Settings → Apps → Flush Finder → Permissions → Location, then try again.",
            actions: ["retry", ...fallbacks],
          }
        : {
            title: "Location permission is off",
            message: env.apple
              ? "In Safari, tap “aA” (or the lock) in the address bar → Website Settings → Location → Allow, then try again."
              : "Tap the lock or settings icon next to the address → Permissions → Location → Allow, then try again.",
            actions: ["retry", ...fallbacks],
          };
    case "timeout":
      return {
        title: "Couldn't find you in time",
        message: env.native
          ? "Your GPS didn't answer quickly. Try again near a window, or set your spot by hand."
          : env.apple
            ? "Your phone didn't share a location. Check Settings → Privacy & Security → Location Services is on, and that Safari Websites is set to “While Using the App”. Then try again, or set your spot by hand."
            : "Your phone didn't share a location. Check that Location is on for your device and for Chrome (Settings → Apps → Chrome → Permissions), then try again, or set your spot by hand.",
        actions: ["retry", ...fallbacks],
      };
    case "insecure":
      return {
        title: "Location needs a secure link",
        message: "Browsers only share location on https links. Open the https:// version of Flush Finder, or set your spot by hand.",
        actions: fallbacks,
      };
    case "unsupported":
      return {
        title: "This browser can't share location",
        message: `Try ${browser}, or set your spot by hand.`,
        actions: fallbacks,
      };
    default:
      return {
        title: "Your location isn't available",
        message: "Location services may be off on this device. Try again, or set your spot by hand.",
        actions: ["retry", ...fallbacks],
      };
  }
}

/* ---------- manually chosen spot ---------- */

export const MANUAL_SPOT_KEY = "ff-manual-spot";

export type ManualSpot = { lat: number; lng: number; at: number };

export function serializeManualSpot(lat: number, lng: number, at = Date.now()): string {
  return JSON.stringify({ lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, at });
}

export function parseManualSpot(raw: string | null | undefined): ManualSpot | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ManualSpot>;
    const { lat, lng } = v;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng, at: typeof v.at === "number" ? v.at : 0 };
  } catch {
    return null;
  }
}
