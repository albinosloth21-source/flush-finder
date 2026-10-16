/**
 * "Restrooms ahead on my route": geocode (Photon, then Nominatim), route (OSRM demo),
 * fall back to a straight-line corridor, then rank pins near the route by distance along it.
 * Pure helpers are unit-tested; the fetchers never throw for "no result", they return null.
 */
import type { Bathroom } from "./types.ts";

export type LatLng = { lat: number; lng: number };
export type TripRoute = { points: LatLng[]; meters: number; seconds: number | null; straightLine: boolean };
export type TripStop = { room: Bathroom; alongMeters: number; offMeters: number; score: number; why: string[] };

export const CORRIDOR_METERS = 3219; // ~2 miles
const UA_EMAIL = "MisfitSoftwareSupport@gmail.com";

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function meters(a: LatLng, b: LatLng): number {
  const x = rad(b.lng - a.lng) * Math.cos(rad((a.lat + b.lat) / 2));
  const y = rad(b.lat - a.lat);
  return R * Math.hypot(x, y);
}

/** Straight-line fallback, densified so corridor tile loading works along the whole way. */
export function straightRoute(from: LatLng, to: LatLng): TripRoute {
  const total = meters(from, to);
  const steps = Math.max(1, Math.ceil(total / 5000));
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t });
  }
  return { points, meters: total, seconds: null, straightLine: true };
}

/** Distance from p to the polyline, and how far along the polyline the closest point is. */
export function projectOnRoute(p: LatLng, points: LatLng[]): { offMeters: number; alongMeters: number } {
  let best = Infinity;
  let bestAlong = 0;
  let run = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const kx = Math.cos(rad((a.lat + b.lat) / 2)) * R * (Math.PI / 180);
    const ky = R * (Math.PI / 180);
    const bx = (b.lng - a.lng) * kx;
    const by = (b.lat - a.lat) * ky;
    const px = (p.lng - a.lng) * kx;
    const py = (p.lat - a.lat) * ky;
    const len2 = bx * bx + by * by;
    const t = len2 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
    const d = Math.hypot(px - t * bx, py - t * by);
    const seg = Math.sqrt(len2);
    if (d < best) {
      best = d;
      bestAlong = run + t * seg;
    }
    run += seg;
  }
  if (points.length === 1) return { offMeters: meters(p, points[0]), alongMeters: 0 };
  return { offMeters: best, alongMeters: bestAlong };
}

const TRUCK_STOP = /\b(truck ?stop|travel (center|plaza|stop)|love'?s|pilot|flying j|petro|ta express|buc-?ee'?s|rest area|welcome center|service plaza)\b/i;

export function stopScore(room: Bathroom): { score: number; why: string[] } {
  let score = 0;
  const why: string[] = [];
  if (room.reviewCount > 0 && room.avgRating != null) {
    score += room.avgRating * 2 + Math.min(3, room.reviewCount / 3);
    if (room.avgRating >= 4) why.push("Highly rated");
  }
  if (TRUCK_STOP.test(room.name)) {
    score += 4;
    why.push("Truck stop / travel center");
  } else if (room.kind === "gas") {
    score += 2.5;
    why.push("Gas station");
  }
  if (room.kind === "toilet" && !room.customersOnly) {
    score += 2;
    why.push("Public restroom");
  }
  if (room.kind === "grocery") score += 1;
  if (room.wheelchair) score += 0.5;
  return { score, why };
}

/**
 * Pins within the corridor, ordered by distance along the route. On long trips keep the
 * best few per stretch (default 3 per 10 miles) so the list stays readable.
 */
export function stopsAlongRoute(
  rooms: Bathroom[],
  route: TripRoute,
  opts: { corridor?: number; perStretch?: number; stretchMeters?: number; max?: number } = {},
): TripStop[] {
  const corridor = opts.corridor ?? CORRIDOR_METERS;
  const perStretch = opts.perStretch ?? 3;
  const stretch = opts.stretchMeters ?? 16_093;
  const seen = new Set<string>();
  const hits: TripStop[] = [];
  for (const room of rooms) {
    if (seen.has(room.id) || room.visibility === "personal" || room.kind === "home") continue;
    seen.add(room.id);
    const { offMeters, alongMeters } = projectOnRoute(room, route.points);
    if (offMeters > corridor) continue;
    const { score, why } = stopScore(room);
    // Closer to the road is better: lose up to 2 points at the corridor edge.
    hits.push({ room, alongMeters, offMeters, score: score - (offMeters / corridor) * 2, why });
  }
  const buckets = new Map<number, TripStop[]>();
  for (const hit of hits) {
    const k = Math.floor(hit.alongMeters / stretch);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(hit);
  }
  const kept: TripStop[] = [];
  for (const list of buckets.values()) {
    list.sort((a, b) => b.score - a.score);
    kept.push(...list.slice(0, perStretch));
  }
  kept.sort((a, b) => a.alongMeters - b.alongMeters);
  return kept.slice(0, opts.max ?? 150);
}

/** Small boxes around the route, for loading map tiles along the corridor. */
export function corridorBoxes(route: TripRoute, padDeg = 0.04, stepMeters = 8000) {
  const boxes: { south: number; west: number; north: number; east: number }[] = [];
  let since = Infinity;
  for (let i = 0; i < route.points.length; i += 1) {
    const p = route.points[i];
    if (i > 0) since += meters(route.points[i - 1], p);
    if (since < stepMeters && i !== route.points.length - 1) continue;
    since = 0;
    boxes.push({ south: p.lat - padDeg, west: p.lng - padDeg, north: p.lat + padDeg, east: p.lng + padDeg });
  }
  return boxes;
}

export function formatMiles(m: number): string {
  const mi = m / 1609.34;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

async function getJson(url: string, ms = 12000): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

let lastNominatim = 0;

/** Photon first (no key, CORS friendly), then Nominatim (1 request/second, identified by email). */
// No location bias on purpose: biasing "Austin" toward a Dallas start returns an Austin St. in Dallas.
export async function geocode(query: string): Promise<(LatLng & { label: string }) | null> {
  const q = query.trim();
  if (!q) return null;
  const bias = "&bbox=-180,17,-64,72"; // US, Puerto Rico, USVI
  const photon = (await getJson(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lang=en${bias}`,
  )) as { features?: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[] } | null;
  const f = photon?.features?.[0];
  if (f) {
    const p = f.properties ?? {};
    const label = [p.name, p.city, p.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
    return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], label: label || q };
  }
  const wait = 1100 - (Date.now() - lastNominatim);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  const nom = (await getJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us,pr,vi&q=${encodeURIComponent(q)}&email=${encodeURIComponent(UA_EMAIL)}`,
  )) as { lat: string; lon: string; display_name: string }[] | null;
  const n = nom?.[0];
  if (!n) return null;
  return { lat: Number(n.lat), lng: Number(n.lon), label: n.display_name.split(",").slice(0, 2).join(",") };
}

/** OSRM public demo server (fair use). Returns null on any failure so callers can fall back. */
export async function osrmRoute(from: LatLng, to: LatLng): Promise<TripRoute | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const json = (await getJson(url, 15000)) as {
    code?: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
  } | null;
  const r = json?.code === "Ok" ? json.routes?.[0] : null;
  if (!r || !r.geometry?.coordinates?.length) return null;
  return {
    points: thin(r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))),
    meters: r.distance,
    seconds: r.duration,
    straightLine: false,
  };
}

/** Drop points closer than ~150 m apart; keeps corridor math fast on cross-country routes. */
export function thin(points: LatLng[], min = 150): LatLng[] {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    if (meters(out[out.length - 1], points[i]) >= min) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

export async function planRoute(from: LatLng, to: LatLng): Promise<TripRoute> {
  return (await osrmRoute(from, to)) ?? straightRoute(from, to);
}
