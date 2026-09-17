import { gunzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildGrid, lookupGrid, type TilePoi } from "./poi-grid.ts";

export type CatalogPoi = {
  id: string;
  osm: string;
  name: string;
  lat: number;
  lng: number;
};

type Bounds = { south: number; west: number; north: number; east: number };

const cache: Partial<Record<"gas" | "grocery", TilePoi[]>> = {};
const grids: Partial<Record<"gas" | "grocery", Map<string, TilePoi[]>>> = {};
let groceryAt = 0;

async function loadFromParts(kind: "gas" | "grocery"): Promise<TilePoi[]> {
  const dir = join(process.cwd(), "src/data/parts");
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as {
    gas: { files: string[] };
    grocery: { files: string[] };
  };
  const files = kind === "gas" ? manifest.gas.files : manifest.grocery.files;
  const rows: TilePoi[] = [];
  for (const file of files) {
    const part = JSON.parse(await readFile(join(dir, file), "utf8")) as CatalogPoi[];
    for (const row of part) rows.push({ ...row, kind });
  }
  return rows;
}

async function loadCatalog(kind: "gas" | "grocery"): Promise<TilePoi[]> {
  if (kind === "gas" && cache.gas?.length) return cache.gas;
  if (kind === "grocery" && cache.grocery?.length && Date.now() - groceryAt < 45_000) {
    return cache.grocery;
  }
  const file =
    kind === "gas" ? "us-gas-stations.json.gz" : "us-grocery-stores.json.gz";
  const dir = join(process.cwd(), "src/data");
  try {
    const buf = await readFile(join(dir, file));
    const rows = JSON.parse(gunzipSync(buf).toString("utf8")) as TilePoi[];
    cache[kind] = Array.isArray(rows) ? rows.map((row) => ({ ...row, kind })) : [];
  } catch {
    try {
      const raw = await readFile(join(dir, file.replace(/\.gz$/, "")), "utf8");
      const rows = JSON.parse(raw) as TilePoi[];
      cache[kind] = rows.map((row) => ({ ...row, kind }));
    } catch {
      try {
        cache[kind] = await loadFromParts(kind);
      } catch {
        cache[kind] = [];
      }
    }
  }
  if (kind === "grocery") groceryAt = Date.now();
  grids[kind] = buildGrid(cache[kind]!);
  return cache[kind]!;
}

export function filterCatalog<T extends { lat: number; lng: number; name?: string }>(
  rows: T[],
  bounds: Bounds,
  limit: number,
): T[] {
  const hits: T[] = [];
  for (const row of rows) {
    if (row.lat < bounds.south || row.lat > bounds.north) continue;
    if (row.lng < bounds.west || row.lng > bounds.east) continue;
    if (!row.name || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
    hits.push(row);
    if (hits.length >= limit) break;
  }
  return hits;
}

export async function catalogInBounds(
  kind: "gas" | "grocery",
  bounds: Bounds,
  limit = 700,
): Promise<TilePoi[]> {
  const rows = await loadCatalog(kind);
  const grid = grids[kind] ?? buildGrid(rows);
  grids[kind] = grid;
  return lookupGrid(grid, bounds, limit);
}

export async function insertCatalogSlice(
  sql: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  kind: "gas" | "grocery",
  rows: CatalogPoi[],
) {
  if (!rows.length) return;
  const chunk = 120;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const params: unknown[] = [];
    const tuples = slice.map((row, idx) => {
      const o = idx * 9;
      params.push(row.id, row.osm, row.name, row.lat, row.lng, "customers", "osm", kind, "public");
      return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9})`;
    });
    await sql.query(
      `insert into bathrooms (id, osm_id, name, lat, lng, access_type, source, kind, visibility)
       values ${tuples.join(",")}
       on conflict do nothing`,
      params,
    );
  }
}
