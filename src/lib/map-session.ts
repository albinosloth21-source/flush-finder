import { PIN_MIN_ZOOM } from "./constants.ts";
import { pinIdNearPoint, pinsVisibleAtZoom } from "./map-hit.ts";
import { hideRemoved, mergeBathrooms } from "./merge-bathrooms.ts";
import { isCatalogSource } from "./pin-policy.ts";
import type { Bathroom } from "./types.ts";

export function composeMapPins(opts: {
  zoom: number;
  minZoom?: number;
  db: Bathroom[];
  osm?: Bathroom[];
  mine?: Bathroom[];
  removedIds?: string[];
  removedOsmIds?: Array<string | null | undefined>;
}): Bathroom[] {
  if (!pinsVisibleAtZoom(opts.zoom, opts.minZoom ?? PIN_MIN_ZOOM)) return [];
  const merged = mergeBathrooms(mergeBathrooms(opts.mine ?? [], opts.db), opts.osm ?? []);
  return hideRemoved(merged, { ids: opts.removedIds ?? [], osmIds: opts.removedOsmIds });
}

export function resolveOpenPin<T extends { id: string }>(id: string | null, rooms: T[], fallback?: T | null): T | null {
  if (!id) return null;
  return rooms.find((room) => room.id === id) ?? (fallback?.id === id ? fallback : null);
}

export function accidentalPinRemovable(pin: { source: string; mine?: boolean } | null | undefined): boolean {
  return Boolean(pin && pin.source === "user" && pin.mine);
}

export function catalogStaysPublic(pin: Bathroom): boolean {
  return !isCatalogSource(pin.source) || pin.visibility === "public";
}
