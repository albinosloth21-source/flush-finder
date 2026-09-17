import type { Bathroom } from "./types.ts";

export const PIN_HIT_PX = 44;

export function isMapChromeTarget(target: EventTarget | null) {
  if (typeof Element === "undefined") return false;
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "header, .ff-pin-hit, .ff-review-sheet, .ff-list-sheet button, .leaflet-control, a, input, textarea, label, [data-ff-chrome]",
    ),
  );
}

export function pinIdNearPoint(
  point: { x: number; y: number },
  bathrooms: { id: string; x: number; y: number }[],
  radius = PIN_HIT_PX,
): string | null {
  let best: { id: string; dist: number } | null = null;
  for (const room of bathrooms) {
    const dx = point.x - room.x;
    const dy = point.y - room.y;
    const dist = Math.min(Math.hypot(dx, dy), Math.hypot(dx, dy + 28));
    if (!best || dist < best.dist) best = { id: room.id, dist };
  }
  return best && best.dist <= radius ? best.id : null;
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
