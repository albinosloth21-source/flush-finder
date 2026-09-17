import { DEFAULT_CENTER, DEFAULT_ZOOM } from "./constants.ts";
import type { MapBounds } from "./types.ts";

export const MAP_VIEW_KEY = "ff-last-map-view-v1";

export type SavedMapView = { lat: number; lng: number; zoom: number };

export function parseSavedMapView(raw: string | null | undefined): SavedMapView | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedMapView>;
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    const zoom = Math.round(Number(parsed.zoom));
    if (!Number.isFinite(lat) || lat < -85 || lat > 85) return null;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
    if (!Number.isFinite(zoom) || zoom < 3 || zoom > 19) return null;
    return { lat, lng, zoom };
  } catch {
    return null;
  }
}

export function readSavedMapView(): SavedMapView {
  if (typeof window === "undefined") return { ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  try {
    return parseSavedMapView(window.localStorage.getItem(MAP_VIEW_KEY)) ?? { ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  } catch {
    return { ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  }
}

export function writeSavedMapView(view: SavedMapView) {
  const parsed = parseSavedMapView(JSON.stringify(view));
  if (!parsed || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_VIEW_KEY, JSON.stringify(parsed));
  } catch {
    /* storage blocked */
  }
}

export function viewFromBounds(bounds: MapBounds): SavedMapView {
  return {
    lat: (bounds.south + bounds.north) / 2,
    lng: (bounds.west + bounds.east) / 2,
    zoom: Math.round(bounds.zoom || DEFAULT_ZOOM),
  };
}
