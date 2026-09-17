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
  return hideRemoved(merged, {
    ids: opts.removedIds ?? [],
    osmIds: opts.removedOsmIds,
  });
}

export function resolveOpenPin<T extends { id: string }>(
  id: string | null,
  rooms: T[],
  fallback?: T | null,
): T | null {
  if (!id) return null;
  return rooms.find((room) => room.id === id) ?? (fallback?.id === id ? fallback : null);
}

export function accidentalPinRemovable(
  pin: { source: string; mine?: boolean } | null | undefined,
): boolean {
  return Boolean(pin && pin.source === "user" && pin.mine);
}

export function openPinAt(
  point: { x: number; y: number },
  rooms: Bathroom[],
  project: (lat: number, lng: number) => { x: number; y: number },
  fallback?: Bathroom | null,
): Bathroom | null {
  const hits = rooms.map((room) => {
    const pt = project(room.lat, room.lng);
    return { id: room.id, x: pt.x, y: pt.y };
  });
  return resolveOpenPin(pinIdNearPoint(point, hits), rooms, fallback);
}

export function keepMinePins(mine: Bathroom[], room: Bathroom): Bathroom[] {
  if (room.source !== "user" || !room.mine) return mine;
  const idx = mine.findIndex((pin) => pin.id === room.id);
  if (idx === -1) return [room, ...mine];
  const next = mine.slice();
  next[idx] = room;
  return next;
}

export function dropMinePin(mine: Bathroom[], id: string): Bathroom[] {
  return mine.filter((pin) => pin.id !== id);
}

export function reviewSheetOpen(input: {
  view: "list" | "detail" | "review" | "add";
  selectedId?: string | null;
  draft?: { lat: number; lng: number } | null;
}): boolean {
  if (input.view === "add") return Boolean(input.draft);
  if (input.view === "detail" || input.view === "review") return Boolean(input.selectedId);
  return false;
}

export function mapTapClosesSheet(input: {
  view: "list" | "detail" | "review" | "add";
  tappedId: string | null;
}): boolean {
  if (input.view === "add" && !input.tappedId) return false;
  return !input.tappedId;
}

export function catalogStaysPublic(pin: Bathroom): boolean {
  return !isCatalogSource(pin.source) || pin.visibility === "public";
}
