// Harvest US public restrooms (OSM amenity=toilets) into static map tiles.
// Writes public/catalog/t/<lat5>_<lng5>.json (5-degree cells, kind "t") and
// public/catalog/t/index.json with counts. Raw Overpass replies are cached in
// .cache/restrooms so reruns are cheap. Usage: node scripts/harvest-us-restrooms.mjs
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = process.cwd();
// Per-cell Overpass replies; reruns skip finished cells. Override with RESTROOM_CACHE.
const CACHE = process.env.RESTROOM_CACHE || join(ROOT, ".cache/restrooms");
const OUT = join(ROOT, "public/catalog/t");
export const T_TILE_DEG = 5;
// Optional parallel prefetch: SHARD=k/N fetches every Nth cell into the cache and exits.
const SHARD = process.env.SHARD?.split("/").map(Number);
const ENDPOINTS_ALL = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const ENDPOINTS = SHARD ? [...ENDPOINTS_ALL.slice(SHARD[0] % ENDPOINTS_ALL.length), ...ENDPOINTS_ALL.slice(0, SHARD[0] % ENDPOINTS_ALL.length)] : ENDPOINTS_ALL;

// Places that are not practical in an urgent need: worship sites, schools and
// childcare, cemeteries, prisons, military bases.
const BLOCK = '["amenity"~"^(place_of_worship|monastery|school|kindergarten|childcare|grave_yard|prison)$"]';
const BLOCK_LANDUSE = '["landuse"~"^(religious|cemetery)$"]';
const NAMER = '["name"]["leisure"~"^(park|recreation_ground|nature_reserve|playground|sports_centre|stadium|beach_resort|marina|golf_course|dog_park|garden)$"]';
const NAMER_TOURISM = '["name"]["tourism"~"^(attraction|zoo|theme_park|camp_site|picnic_site)$"]';
// Plain bbox queries (no "around"), polygons returned as bounding boxes: fast enough
// for public Overpass mirrors at 3x4 degree cells.
function cellQuery(bb) {
  return (
    `[out:json][timeout:180][maxsize:1073741824];nwr["amenity"="toilets"](${bb});out center tags;` +
    `(way${BLOCK}(${bb});rel${BLOCK}(${bb});way${BLOCK_LANDUSE}(${bb});rel${BLOCK_LANDUSE}(${bb}););out tags bb;` +
    `node["amenity"="place_of_worship"](${bb});out tags;` +
    `(way${NAMER}(${bb});rel${NAMER}(${bb});way["name"]["natural"="beach"](${bb});way${NAMER_TOURISM}(${bb}););out tags bb;`
  );
}

function grid() {
  const list = [];
  for (let lat = 24; lat < 50; lat += 3) for (let lng = -125; lng < -66; lng += 4) list.push([lat, lng, lat + 3, lng + 4]);
  for (let lng = -180; lng < -129; lng += 10) list.push([51, lng, 72, lng + 10]); // Alaska
  list.push([18.8, -160.5, 22.4, -154.7]); // Hawaii
  list.push([17.8, -67.4, 18.6, -64.5]); // Puerto Rico + USVI
  return list;
}

async function overpass(query, tries = 3) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "FlushFinder/1.0 restroom harvest" },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(200_000),
        });
        if (!res.ok) { console.log(`  ${url} HTTP ${res.status}`); continue; }
        const json = await res.json();
        if (json.remark && /error|timed out|runtime/i.test(json.remark)) { console.log(`  ${url} ${json.remark.slice(0, 120)}`); continue; }
        return json.elements ?? [];
      } catch {
        /* next */
      }
    }
    await new Promise((r) => setTimeout(r, Math.min(120_000, 10_000 * 2 ** attempt)));
  }
  return null;
}

function meters(a, b) {
  const p = Math.PI / 180;
  const x = (b[1] - a[1]) * p * Math.cos(((a[0] + b[0]) / 2) * p);
  const y = (b[0] - a[0]) * p;
  return 6371000 * Math.hypot(x, y);
}
function inPoly(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ay, ax] = poly[i];
    const [by, bx] = poly[j];
    if (ay > pt[0] !== by > pt[0] && pt[1] < ((bx - ax) * (pt[0] - ay)) / (by - ay) + ax) c = !c;
  }
  return c;
}
function rings(el) {
  if (el.geometry) return [el.geometry.map((g) => [g.lat, g.lon])];
  if (el.members) return el.members.filter((m) => m.role !== "inner" && m.geometry).map((m) => m.geometry.map((g) => [g.lat, g.lon]));
  return [];
}
function near(pt, el, m) {
  if (el.type === "node") return meters(pt, [el.lat, el.lon]) <= m;
  if (el.bounds && !el.geometry && !el.members?.some((x) => x.geometry)) {
    const pad = m / 111_000;
    const b = el.bounds;
    const padLng = pad / Math.max(0.2, Math.cos((pt[0] * Math.PI) / 180));
    return pt[0] >= b.minlat - pad && pt[0] <= b.maxlat + pad && pt[1] >= b.minlon - padLng && pt[1] <= b.maxlon + padLng;
  }
  for (const ring of rings(el)) {
    if (ring.length > 2 && inPoly(pt, ring)) return true;
    if (m > 0 && ring.some((v) => meters(pt, v) <= m)) return true;
  }
  return false;
}
function reasonOf(tags) {
  if (tags.amenity === "place_of_worship" || tags.amenity === "monastery" || tags.landuse === "religious") return "worship";
  if (["school", "kindergarten", "childcare"].includes(tags.amenity)) return "school";
  if (tags.amenity === "grave_yard" || tags.landuse === "cemetery") return "cemetery";
  if (tags.amenity === "prison") return "prison";
  return "other";
}
const WORSHIP_NAME = /\b(church|chapel|cathedral|mosque|synagogue|parish|basilica|tabernacle|kingdom hall|ministries|baptist|methodist|presbyterian|lutheran|catholic|latter[- ]day|masjid|gurdwara|temple)\b/i;
const SCHOOL_NAME = /\b(school|elementary|middle school|high school|academy|daycare|preschool)\b/i;

const PRIVATE = new Set(["private", "no", "customers", "permissive_customers", "delivery", "employees", "staff", "students", "members"]);

function tileOf(lat, lng) {
  return `${Math.floor(lat / T_TILE_DEG) * T_TILE_DEG}_${Math.floor(lng / T_TILE_DEG) * T_TILE_DEG}`;
}

async function existingPins() {
  const pins = [];
  for (const [file, kind] of [["us-gas-stations.json.gz", "g"], ["us-grocery-stores.json.gz", "y"]]) {
    try {
      const rows = JSON.parse(gunzipSync(await readFile(join(ROOT, "src/data", file))).toString("utf8"));
      for (const r of rows) pins.push([r.lat, r.lng, kind]);
    } catch {
      /* optional */
    }
  }
  return pins;
}

// Grid cells overlap Canada, Mexico, the Bahamas, Cuba and Russia; drop toilets inside
// those countries (Natural Earth 10m outlines via datasets/geo-countries).
const COUNTRIES_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
async function countryPolygons() {
  const file = join(ROOT, ".cache/countries.geojson");
  if (!existsSync(file)) {
    await mkdir(join(ROOT, ".cache"), { recursive: true });
    const res = await fetch(COUNTRIES_URL);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  const geo = JSON.parse(await readFile(file, "utf8"));
  const polys = [];
  for (const f of geo.features) {
    const iso = f.properties["ISO3166-1-Alpha-3"];
    if (!["USA", "PRI", "VIR", "CAN", "MEX", "BHS", "CUB", "RUS"].includes(iso)) continue;
    const us = ["USA", "PRI", "VIR"].includes(iso);
    const parts = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const part of parts) {
      const ring = part[0].map(([x, y]) => [y, x]);
      const ys = ring.map((v) => v[0]);
      const xs = ring.map((v) => v[1]);
      polys.push({ us, ring, box: [Math.min(...ys), Math.min(...xs), Math.max(...ys), Math.max(...xs)] });
    }
  }
  // Vertex index (0.5 degree buckets) for "which country's coast is closest" on offshore points.
  const verts = new Map();
  for (const p of polys) for (const v of p.ring) {
    const k = `${Math.floor(v[0] * 2)}_${Math.floor(v[1] * 2)}`;
    (verts.get(k) ?? verts.set(k, []).get(k)).push([v[0], v[1], p.us]);
  }
  return { polys, verts };
}
const COUNTRIES = await countryPolygons();
// Keep points inside the US/PR/VI outline; drop points inside a neighbor. Points in
// neither (beaches, piers, small islands the 10m outline misses) go to the country
// whose outline vertex is nearest.
function isForeign(pt) {
  for (const p of COUNTRIES.polys) {
    if (pt[0] < p.box[0] || pt[0] > p.box[2] || pt[1] < p.box[1] || pt[1] > p.box[3]) continue;
    if (inPoly(pt, p.ring)) return !p.us;
  }
  let best = Infinity;
  let us = true;
  const by = Math.floor(pt[0] * 2);
  const bx = Math.floor(pt[1] * 2);
  for (let r = 1; r <= 4 && best === Infinity; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
      for (const v of COUNTRIES.verts.get(`${by + dy}_${bx + dx}`) ?? []) {
        const m = meters(pt, v);
        if (m < best) { best = m; us = v[2]; }
      }
    }
  }
  return !us;
}

// Dense cells can time out; split into quarters (up to two levels) when that happens.
async function fetchCell(s, w, n, e, depth) {
  const els = await overpass(cellQuery(`${s},${w},${n},${e}`), depth === 0 ? 2 : 4);
  if (els || depth >= 2) return els;
  const mLat = (s + n) / 2;
  const mLng = (w + e) / 2;
  const seen = new Map();
  for (const [a, b, c, d] of [[s, w, mLat, mLng], [s, mLng, mLat, e], [mLat, w, n, mLng], [mLat, mLng, n, e]]) {
    const part = await fetchCell(a, b, c, d, depth + 1);
    if (!part) return null;
    for (const el of part) seen.set(`${el.type}/${el.id}`, el);
  }
  return [...seen.values()];
}

const stats = { fetched: 0, excluded: {}, deduped: 0, nearExisting: 0, failedCells: [] };
const bump = (k) => (stats.excluded[k] = (stats.excluded[k] ?? 0) + 1);

await mkdir(CACHE, { recursive: true });
const cells = grid();
const kept = new Map();
let n = 0;
for (const [s, w, nn, e] of cells) {
  n += 1;
  if (SHARD && n % SHARD[1] !== SHARD[0]) continue;
  const file = join(CACHE, `${s}_${w}.json`);
  let els = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : null;
  if (!els) {
    els = await fetchCell(s, w, nn, e, 0);
    if (!els) {
      stats.failedCells.push(`${s}_${w}`);
      console.log(`cell ${n}/${cells.length} ${s},${w} FAILED`);
      continue;
    }
    await writeFile(file, JSON.stringify(els));
  }
  if (SHARD) { console.log(`shard cell ${n} cached`); continue; }
  const toilets = [];
  const blockers = [];
  const namers = [];
  for (const el of els) {
    const t = el.tags ?? {};
    if (t.amenity === "toilets") toilets.push(el);
    else if (t.leisure || t.boundary || t.natural || t.tourism) namers.push(el);
    else blockers.push(el);
  }
  for (const el of toilets) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null || lat < s || lat >= nn || lng < w || lng >= e) continue;
    const pt = [lat, lng];
    if (isForeign(pt)) continue;
    stats.fetched += 1;
    const access = (t.access ?? t["toilets:access"] ?? "").toLowerCase();
    if (PRIVATE.has(access)) { bump(`access_${access}`); continue; }
    if (t.religion || t.denomination || WORSHIP_NAME.test(`${t.name ?? ""} ${t.operator ?? ""}`)) { bump("worship"); continue; }
    if (SCHOOL_NAME.test(`${t.name ?? ""} ${t.operator ?? ""}`)) { bump("school"); continue; }
    if (t.disused === "yes" || t["opening_hours"] === "off" || t.construction) { bump("closed"); continue; }
    const block = blockers.find((b) => near(pt, b, b.type === "node" ? 25 : 10));
    if (block) { bump(reasonOf(block.tags ?? {})); continue; }
    let name = t.name || t["name:en"];
    if (!name || /^(toilets?|restrooms?|public toilets?|bathrooms?|wc|comfort station)$/i.test(name.trim())) {
      const place = namers.find((p) => p.tags?.name && near(pt, p, 40));
      name = place ? `Restroom at ${place.tags.name}` : "Public restroom";
    }
    const id = `osm:${el.type}:${el.id}`;
    if (kept.has(id)) continue;
    kept.set(id, { i: id, o: `${el.type}/${el.id}`, n: String(name).slice(0, 80), a: Math.round(lat * 1e6) / 1e6, g: Math.round(lng * 1e6) / 1e6, k: "t" });
  }
  console.log(`cell ${n}/${cells.length} ${s},${w} toilets ${toilets.length} kept ${kept.size}`);
}

if (SHARD) process.exit(stats.failedCells.length ? 1 : 0);

// Dedupe restrooms within 15 m (prefer named), then skip ones within 32 m of existing pins.
const bucket = (lat, lng) => `${Math.round(lat * 500)}_${Math.round(lng * 500)}`; // ~200 m buckets
function index(points) {
  const m = new Map();
  for (const p of points) {
    const k = bucket(p[0], p[1]);
    (m.get(k) ?? m.set(k, []).get(k)).push(p);
  }
  return m;
}
function anyNear(m, pt, r) {
  const by = Math.round(pt[0] * 500);
  const bx = Math.round(pt[1] * 500);
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    for (const q of m.get(`${by + dy}_${bx + dx}`) ?? []) if (meters(pt, q) < r) return true;
  }
  return false;
}
const rows = [...kept.values()].sort((a, b) => Number(b.n !== "Public restroom") - Number(a.n !== "Public restroom"));
const placed = new Map();
const existing = index(await existingPins());
const final = [];
for (const r of rows) {
  const pt = [r.a, r.g];
  if (anyNear(placed, pt, 15)) { stats.deduped += 1; continue; }
  if (anyNear(existing, pt, 32)) { stats.nearExisting += 1; continue; }
  const k = bucket(r.a, r.g);
  (placed.get(k) ?? placed.set(k, []).get(k)).push(pt);
  final.push(r);
}

await mkdir(OUT, { recursive: true });
for (const f of await readdir(OUT)) if (/^-?\d+_-?\d+\.json$/.test(f)) await writeFile(join(OUT, f), "[]");
const tiles = new Map();
for (const r of final) {
  const k = tileOf(r.a, r.g);
  (tiles.get(k) ?? tiles.set(k, []).get(k)).push(r);
}
for (const [k, list] of tiles) {
  list.sort((a, b) => a.a - b.a || a.g - b.g);
  await writeFile(join(OUT, `${k}.json`), JSON.stringify(list));
}
const index_ = {
  tile: T_TILE_DEG,
  files: tiles.size,
  pois: final.length,
  keys: [...tiles.keys()].sort(),
  stats: { ...stats, added: final.length, named: final.filter((r) => r.n !== "Public restroom").length },
  source: "OpenStreetMap contributors (ODbL), amenity=toilets",
  harvested: new Date().toISOString().slice(0, 10),
};
await writeFile(join(OUT, "index.json"), JSON.stringify(index_, null, 1));
console.log(JSON.stringify(index_.stats, null, 1), "tiles", tiles.size);
