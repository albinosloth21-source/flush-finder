import { test } from "node:test";
import assert from "node:assert/strict";
import { corridorBoxes, projectOnRoute, stopsAlongRoute, straightRoute, thin } from "./road-trip.ts";
import type { Bathroom } from "./types.ts";

function room(id: string, lat: number, lng: number, extra: Partial<Bathroom> = {}): Bathroom {
  return {
    id, osmId: null, name: id, lat, lng, accessType: "public", fee: null, wheelchair: null, address: null,
    source: "osm", kind: "toilet", visibility: "public", mine: false, avgRating: null, reviewCount: 0,
    avgCleanliness: null, avgAvailability: null, avgAccessibility: null, avgAtmosphere: null,
    askForKey: false, customersOnly: false, ...extra,
  };
}

// Dallas -> Austin straight line, roughly along I-35.
const dallas = { lat: 32.7767, lng: -96.797 };
const austin = { lat: 30.2672, lng: -97.7431 };

test("straight fallback route is densified and measured", () => {
  const r = straightRoute(dallas, austin);
  assert.ok(r.straightLine);
  assert.ok(r.points.length > 50);
  assert.ok(r.meters > 280_000 && r.meters < 300_000);
});

test("projection gives distance off and along the route", () => {
  const r = straightRoute(dallas, austin);
  const mid = { lat: (dallas.lat + austin.lat) / 2, lng: (dallas.lng + austin.lng) / 2 };
  const p = projectOnRoute(mid, r.points);
  assert.ok(p.offMeters < 50);
  assert.ok(Math.abs(p.alongMeters - r.meters / 2) < 2000);
});

test("stops are within ~2 miles, ordered along the route, and favor truck stops and ratings", () => {
  const r = straightRoute(dallas, austin);
  const along = (t: number, dLng = 0) => ({ lat: dallas.lat + (austin.lat - dallas.lat) * t, lng: dallas.lng + (austin.lng - dallas.lng) * t + dLng });
  const near1 = along(0.2);
  const near2 = along(0.6);
  const far = along(0.4, 0.5); // ~45 km off route
  const rooms = [
    room("late-public", near2.lat, near2.lng),
    room("far", far.lat, far.lng),
    room("Buc-ee's", near1.lat, near1.lng + 0.005, { kind: "gas", customersOnly: true, accessType: "customers" }),
    room("meh", near1.lat + 0.001, near1.lng, { kind: "grocery", customersOnly: true }),
  ];
  const stops = stopsAlongRoute(rooms, r, { perStretch: 1 });
  assert.deepEqual(stops.map((s) => s.room.id), ["Buc-ee's", "late-public"]);
  assert.ok(stops[0].why.includes("Truck stop / travel center"));
});

test("thin and corridor boxes keep the endpoints", () => {
  const r = straightRoute(dallas, austin);
  const t = thin(r.points, 20_000);
  assert.deepEqual(t[0], r.points[0]);
  assert.deepEqual(t[t.length - 1], r.points[r.points.length - 1]);
  const boxes = corridorBoxes(r);
  assert.ok(boxes.length > 30);
});

import { navUrl, platformNavApp } from "./directions.ts";

test("take me there URLs and platform default", () => {
  const d = { lat: 32.331017, lng: -96.11268 };
  assert.equal(navUrl("google", d), "https://www.google.com/maps/dir/?api=1&destination=32.331017,-96.11268");
  assert.equal(navUrl("apple", d), "https://maps.apple.com/?daddr=32.331017,-96.11268");
  assert.equal(navUrl("waze", d), "https://waze.com/ul?ll=32.331017,-96.11268&navigate=yes");
  assert.equal(platformNavApp("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "apple");
  assert.equal(platformNavApp("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), "apple");
  assert.equal(platformNavApp("Mozilla/5.0 (Linux; Android 15; Pixel 9)"), "google");
});
