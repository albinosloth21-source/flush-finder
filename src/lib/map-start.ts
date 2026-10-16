import { US_CENTER, US_OVERVIEW_ZOOM } from "./constants.ts";
import { DEFAULT_RADIUS_MILES, zoomForMiles, type RadiusMiles } from "./search-radius.ts";

export type LocationPermission = "granted" | "denied" | "prompt" | "unknown";
export type LocationChoice = "share" | "browse";

export type MapStartView = {
  lat: number;
  lng: number;
  zoom: number;
};

export function usOverviewView(): MapStartView {
  return { lat: US_CENTER.lat, lng: US_CENTER.lng, zoom: US_OVERVIEW_ZOOM };
}

export function locatedStartView(
  coords: { lat: number; lng: number },
  miles: RadiusMiles = DEFAULT_RADIUS_MILES,
): MapStartView {
  return { lat: coords.lat, lng: coords.lng, zoom: zoomForMiles(miles) };
}

/** Keep the wide US map until the user is zoomed in far enough for a mile ring. */
export function shouldFitRadiusOnMap(zoom: number): boolean {
  return zoom >= 9;
}

/** Street map with state labels is readable; satellite at country zoom looks like a gray blob. */
export function preferLabeledMap(zoom: number): boolean {
  return zoom < 8;
}

export function sameMapView(
  a: { lat: number; lng: number; zoom: number },
  b: { lat: number; lng: number; zoom: number },
): boolean {
  return (
    Math.abs(a.lat - b.lat) < 0.0008 &&
    Math.abs(a.lng - b.lng) < 0.0008 &&
    Math.abs(a.zoom - b.zoom) < 0.05
  );
}

/** Country-scale jumps must snap, not animate — flyTo across America scrambles tiles. */
export function shouldInstantMapJump(
  from: { lat: number; lng: number; zoom: number },
  to: { lat: number; lng: number; zoom: number },
  distanceMeters: number,
): boolean {
  if (Math.abs(from.zoom - to.zoom) >= 3) return true;
  if (distanceMeters > 40_000) return true;
  return false;
}

export function shouldAskForLocation(
  permission: LocationPermission,
  choice: LocationChoice | null,
): boolean {
  if (choice === "browse" || choice === "share") return false;
  if (permission === "granted" || permission === "denied") return false;
  return true;
}

/**
 * Locate on load when the OS already allows it, or when the user tapped "Use my location"
 * earlier this session. Safari reports "prompt" (or throws -> "unknown") even right after the
 * user allowed location, so a reload would otherwise leave them on the national map with no prompt.
 */
export function shouldAutoLocate(
  permission: LocationPermission,
  choice: LocationChoice | null = null,
): boolean {
  if (permission === "granted") return true;
  return choice === "share" && (permission === "prompt" || permission === "unknown");
}

export function resolveMapStart(opts: {
  permission: LocationPermission;
  coords: { lat: number; lng: number } | null;
  miles?: RadiusMiles;
}): MapStartView {
  if (opts.coords) return locatedStartView(opts.coords, opts.miles);
  return usOverviewView();
}
