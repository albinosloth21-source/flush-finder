import { catalogToBathroom, keysForBounds, type TilePoi } from "./poi-grid.ts";
import type { Bathroom } from "./types.ts";

type CompactPoi = {
  i: string;
  o: string;
  n: string;
  a: number;
  g: number;
  k: "g" | "y";
};

const tileCache = new Map<string, Bathroom[]>();

function unpack(row: CompactPoi): Bathroom {
  return catalogToBathroom(
    { id: row.i, osm: row.o, name: row.n, lat: row.a, lng: row.g },
    row.k === "y" ? "grocery" : "gas",
  );
}

export async function loadPoiTiles(
  bounds: { south: number; west: number; north: number; east: number },
): Promise<Bathroom[]> {
  const keys = keysForBounds(bounds);
  const rooms: Bathroom[] = [];
  await Promise.all(
    keys.map(async (key) => {
      const cached = tileCache.get(key);
      if (cached) {
        rooms.push(...cached);
        return;
      }
      try {
        const res = await fetch(`/catalog/c/${key}.json`, { cache: "force-cache" });
        if (!res.ok) {
          tileCache.set(key, []);
          return;
        }
        const rows = (await res.json()) as CompactPoi[];
        const mapped = Array.isArray(rows) ? rows.map(unpack) : [];
        tileCache.set(key, mapped);
        rooms.push(...mapped);
      } catch {
        tileCache.set(key, []);
      }
    }),
  );
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
