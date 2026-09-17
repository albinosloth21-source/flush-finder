import { writeFile, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const OUT = join(process.cwd(), "src/data/us-grocery-stores.json");
const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

const FILTER =
  '["shop"~"^(supermarket|grocery|hypermarket|wholesale|department_store)$"]["name"]';

function tiles() {
  const list = [];
  for (let lat = 24; lat < 50; lat += 4) {
    for (let lng = -125; lng < -66; lng += 4) {
      list.push({ south: lat, west: lng, north: Math.min(lat + 4, 50), east: Math.min(lng + 4, -66) });
    }
  }
  list.push({ south: 18.8, west: -156.2, north: 22.4, east: -154.7 });
  list.push({ south: 51.1, west: -170.2, north: 71.5, east: -129.8 });
  return list;
}

async function overpass(query) {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "FlushFinder/1.0 grocery harvest",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(28000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      return json.elements ?? [];
    } catch {
      continue;
    }
  }
  return [];
}

function mapEl(el) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const tags = el.tags ?? {};
  const name = tags.name || tags.brand || tags.operator;
  if (lat == null || lng == null || !name) return null;
  return {
    id: `osm:${el.type}:${el.id}`,
    osm: `${el.type}/${el.id}`,
    name: String(name).slice(0, 80),
    lat,
    lng,
  };
}

const byId = new Map();
try {
  const prev = JSON.parse(await readFile(OUT, "utf8"));
  for (const row of prev) byId.set(row.id, row);
} catch {
  /* fresh */
}

const grid = tiles();
let i = 0;
for (const tile of grid) {
  i += 1;
  const bbox = `${tile.south},${tile.west},${tile.north},${tile.east}`;
  const query = `[out:json][timeout:25];(node${FILTER}(${bbox});way${FILTER}(${bbox}););out center 4000;`;
  const els = await overpass(query);
  let added = 0;
  for (const el of els) {
    const row = mapEl(el);
    if (!row || byId.has(row.id)) continue;
    byId.set(row.id, row);
    added += 1;
  }
  if (i % 4 === 0 || added) {
    const rows = [...byId.values()];
    await writeFile(OUT, JSON.stringify(rows));
    console.log(`${i}/${grid.length} tiles grocery=${rows.length} +${added}`);
  }
}

const rows = [...byId.values()];
await writeFile(OUT, JSON.stringify(rows));
await writeFile(`${OUT}.gz`, gzipSync(Buffer.from(JSON.stringify(rows))));
console.log(`done ${rows.length}`);
