import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "public/catalog/c");

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadParts(kind) {
  const dir = join(ROOT, "src/data/parts");
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  const files = manifest[kind].files;
  const rows = [];
  for (const file of files) {
    const part = JSON.parse(await readFile(join(dir, file), "utf8"));
    rows.push(...part);
  }
  return rows;
}

async function loadGas() {
  try {
    const gz = await readFile(join(ROOT, "src/data/us-gas-stations.json.gz"));
    return JSON.parse(gunzipSync(gz).toString("utf8"));
  } catch {
    try {
      return await loadJson(join(ROOT, "src/data/us-gas-stations.json"));
    } catch {
      return loadParts("gas");
    }
  }
}

const cells = new Map();
function push(kind, row) {
  if (!row?.name || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return;
  const key = `${Math.floor(row.lat)}_${Math.floor(row.lng)}`;
  const list = cells.get(key) ?? [];
  list.push({
    i: row.id,
    o: row.osm,
    n: String(row.name).slice(0, 80),
    a: Math.round(row.lat * 1e6) / 1e6,
    g: Math.round(row.lng * 1e6) / 1e6,
    k: kind,
  });
  cells.set(key, list);
}

const gas = await loadGas();
for (const row of gas) push("g", row);
try {
  const grocery = await loadJson(join(ROOT, "src/data/us-grocery-stores.json"));
  for (const row of grocery) push("y", row);
} catch {
  try {
    const grocery = await loadParts("grocery");
    for (const row of grocery) push("y", row);
  } catch {
    /* optional */
  }
}

await mkdir(OUT, { recursive: true });
let files = 0;
let pois = 0;
for (const [key, rows] of cells) {
  await writeFile(join(OUT, `${key}.json`), JSON.stringify(rows));
  files += 1;
  pois += rows.length;
}
await writeFile(join(ROOT, "public/catalog/index.json"), JSON.stringify({ files, pois, tile: 1 }));
console.log(`tiles ${files} pois ${pois}`);
