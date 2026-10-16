import { catalogToBathroom, keysForBounds, type TilePoi } from "./poi-grid.ts";
import type { Bathroom } from "./types.ts";

type CompactPoi = {
  i: string;
  o: string;
  n: string;
  a: number;
  g: number;
  /** g = gas, y = grocery, t = public restroom (OpenStreetMap, unverified) */
  k: "g" | "y" | "t";
};

/** Public restroom tiles are coarser (5 degree cells) to keep the file count small. */
export const RESTROOM_TILE_DEG = 5;

const tileCache = new Map<string, Bathroom[]>();
let restroomKeys: Promise<Set<string>> | null = null;

export function unpackPoi(row: CompactPoi): Bathroom {
  const kind = row.k === "t" ? "toilet" : row.k === "y" ? "grocery" : "gas";
  return catalogToBathroom({ id: row.i, osm: row.o, name: row.n, lat: row.a, lng: row.g }, kind);
}

export function restroomKeysForBounds(bounds: { south: number; west: number; north: number; east: number }): string[] {
  const d = RESTROOM_TILE_DEG;
  const keys: string[] = [];
  for (let lat = Math.floor(bounds.south / d) * d; lat <= Math.floor(bounds.north / d) * d; lat += d) {
    for (let lng = Math.floor(bounds.west / d) * d; lng <= Math.floor(bounds.east / d) * d; lng += d) {
      keys.push(`${lat}_${lng}`);
    }
  }
  return keys;
}

function knownRestroomKeys(): Promise<Set<string>> {
  restroomKeys ??= fetch("/catalog/t/index.json", { cache: "force-cache" })
    .then((res) => (res.ok ? res.json() : { keys: [] }))
    .then((json: { keys?: string[] }) => new Set(json.keys ?? []))
    .catch(() => new Set<string>());
  return restroomKeys;
}

async function loadTile(cacheKey: string, url: string, rooms: Bathroom[]) {
  const cached = tileCache.get(cacheKey);
  if (cached) {
    rooms.push(...cached);
    return;
  }
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) {
      tileCache.set(cacheKey, []);
      return;
    }
    const rows = (await res.json()) as CompactPoi[];
    const mapped = Array.isArray(rows) ? rows.map(unpackPoi) : [];
    tileCache.set(cacheKey, mapped);
    rooms.push(...mapped);
  } catch {
    tileCache.set(cacheKey, []);
  }
}

export async function loadPoiTiles(
  bounds: { south: number; west: number; north: number; east: number },
): Promise<Bathroom[]> {
  const rooms: Bathroom[] = [];
  const known = await knownRestroomKeys();
  const restroomKeys = restroomKeysForBounds(bounds).filter((key) => known.has(key));
  await Promise.all([
    ...keysForBounds(bounds).map((key) => loadTile(`c:${key}`, `/catalog/c/${key}.json`, rooms)),
    ...restroomKeys.map((key) => loadTile(`t:${key}`, `/catalog/t/${key}.json`, rooms)),
  ]);
  return rooms.filter(
    (row) =>
      row.lat >= bounds.south &&
      row.lat <= bounds.north &&
      row.lng >= bounds.west &&
      row.lng <= bounds.east,
  );
}

export { keysForBounds };
export type { TilePoi };
