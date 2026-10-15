import type { Bathroom } from "./types.ts";

export const PIN_HIT_PX = 28;

export function isMapChromeTarget(target: EventTarget | null) {
  if (typeof Element === "undefined") return false;
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "header, .ff-pin-hit, .ff-review-sheet, .ff-list-sheet, .ff-list-peek, .ff-zoom, .leaflet-control, a, input, textarea, label, [data-ff-chrome], [data-ff-sheet-handle]",
    ),
  );
}

function pinDist(point: { x: number; y: number }, pin: { x: number; y: number }) {
  const dx = point.x - pin.x;
  const dy = point.y - pin.y;
  const tip = Math.hypot(dx, dy);
  const body = Math.hypot(dx, dy + 28);
  return Math.min(tip, body);
}

export function pinsNearPoint(
  point: { x: number; y: number },
  bathrooms: { id: string; x: number; y: number }[],
  radius = PIN_HIT_PX,
): { id: string; dist: number }[] {
  const hits: { id: string; dist: number }[] = [];
  for (const room of bathrooms) {
    const dist = pinDist(point, room);
    if (dist <= radius) hits.push({ id: room.id, dist });
  }
  hits.sort((a, b) => a.dist - b.dist);
  return hits;
}

export function pinIdNearPoint(
  point: { x: number; y: number },
  bathrooms: { id: string; x: number; y: number }[],
  radius = PIN_HIT_PX,
): string | null {
  return pinsNearPoint(point, bathrooms, radius)[0]?.id ?? null;
}

export function pinsVisibleAtZoom(zoom: number, minZoom: number) {
  return zoom >= minZoom;
}

export function screenPins(bathrooms: Bathroom[], project: (lat: number, lng: number) => { x: number; y: number }) {
  return bathrooms.map((room) => {
    const pt = project(room.lat, room.lng);
    return { id: room.id, x: pt.x, y: pt.y };
  });
}
