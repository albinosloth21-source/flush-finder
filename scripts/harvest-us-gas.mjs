#!/usr/bin/env node
/** Harvest OSM amenity=fuel across the US into a compact JSON catalog. */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const OUT = "src/data/us-gas-stations.json";

function tiles() {
  const out = [];
  const south = 24.4;
  const north = 49.5;
  const west = -124.9;
  const east = -66.7;
  const rows = 6;
  const cols = 10;
  const dLat = (north - south) / rows;
  const dLng = (east - west) / cols;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      out.push({
        south: +(south + r * dLat).toFixed(4),
        north: +(south + (r + 1) * dLat).toFixed(4),
        west: +(west + c * dLng).toFixed(4),
        east: +(west + (c + 1) * dLng).toFixed(4),
      });
    }
  }
  out.push({ south: 51.1, west: -179.2, north: 71.6, east: -129.8 });
  out.push({ south: 18.8, west: -160.4, north: 22.4, east: -154.7 });
  out.push({ south: 17.6, west: -65.1, north: 18.6, east: -64.5 });
  return out;
}

function queryFor(b) {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  return `[out:json][timeout:50];(node["amenity"="fuel"](${bbox});way["amenity"="fuel"](${bbox}););out center;`;
}

async function fetchTile(b) {
  const body = `data=${encodeURIComponent(queryFor(b))}`;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "FlushFinder/1.0 (restroom map gas harvest)",
        },
        body,
        signal: AbortSignal.timeout(55000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (Array.isArray(json.elements)) return json.elements;
    } catch {
      continue;
    }
  }
  return null;
}

function nameOf(tags = {}) {
  return tags.name || tags["name:en"] || tags.brand || tags.operator || "Gas station";
}

function addElements(seen, els) {
  let added = 0;
  for (const el of els) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lng ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    if (lat < 17.5 || lat > 72 || lng < -180 || lng > -64) continue;
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      id: `osm:${el.type}:${el.id}`,
      osm: key,
      name: nameOf(el.tags).slice(0, 80),
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
    });
    added += 1;
  }
  return added;
}

function save(seen) {
  mkdirSync("src/data", { recursive: true });
  writeFileSync(OUT, JSON.stringify([...seen.values()]));
}

async function main() {
  const grid = tiles();
  const seen = new Map();
  if (existsSync(OUT)) {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    for (const row of prev) seen.set(row.osm, row);
    console.log(`[gas] resumed ${seen.size}`);
  }
  for (let i = 0; i < grid.length; i += 1) {
    const tile = grid[i];
    let els = await fetchTile(tile);
    if (els == null) {
      const midLat = (tile.south + tile.north) / 2;
      const midLng = (tile.west + tile.east) / 2;
      const halves = [
        { south: tile.south, west: tile.west, north: midLat, east: midLng },
        { south: tile.south, west: midLng, north: midLat, east: tile.east },
        { south: midLat, west: tile.west, north: tile.north, east: midLng },
        { south: midLat, west: midLng, north: tile.north, east: tile.east },
      ];
      els = [];
      for (const half of halves) {
        const more = (await fetchTile(half)) ?? [];
        els.push(...more);
      }
    }
    addElements(seen, els);
    save(seen);
    console.log(`[gas] tile ${i + 1}/${grid.length} total=${seen.size} got=${els.length}`);
  }
  console.log(`[gas] wrote ${seen.size} stations`);
}

await main();
