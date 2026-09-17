import type { Bathroom } from "./types.ts";

export const TILE_DEG = 1;

export type TilePoi = {
  id: string;
  osm: string;
  name: string;
  lat: number;
  lng: number;
  kind: "gas" | "grocery";
};

export function tileKey(lat: number, lng: number): string {
  return `${Math.floor(lat)}_${Math.floor(lng)}`;
}

export function keysForBounds(bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}): string[] {
  const south = Math.floor(bounds.south);
  const north = Math.floor(bounds.north);
  const west = Math.floor(bounds.west);
  const east = Math.floor(bounds.east);
  const keys: string[] = [];
  for (let lat = south; lat <= north; lat += 1) {
    for (let lng = west; lng <= east; lng += 1) {
      keys.push(`${lat}_${lng}`);
    }
  }
  return keys;
}

export function buildGrid(rows: TilePoi[]): Map<string, TilePoi[]> {
  const grid = new Map<string, TilePoi[]>();
  for (const row of rows) {
    if (!row.name || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
    const key = tileKey(row.lat, row.lng);
    const cell = grid.get(key);
    if (cell) cell.push(row);
    else grid.set(key, [row]);
  }
  return grid;
}

export function lookupGrid(
  grid: Map<string, TilePoi[]>,
  bounds: { south: number; west: number; north: number; east: number },
  limit = 800,
): TilePoi[] {
  const hits: TilePoi[] = [];
  for (const key of keysForBounds(bounds)) {
    const cell = grid.get(key);
    if (!cell) continue;
    for (const row of cell) {
      if (row.lat < bounds.south || row.lat > bounds.north) continue;
      if (row.lng < bounds.west || row.lng > bounds.east) continue;
      hits.push(row);
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}
