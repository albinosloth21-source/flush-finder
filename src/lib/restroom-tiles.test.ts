import { test } from "node:test";
import assert from "node:assert/strict";
import { restroomKeysForBounds, unpackPoi } from "./poi-tiles.ts";
import { matchesNearbyFilter } from "./search-radius.ts";

test("public restroom tile rows unpack as unverified public restrooms", () => {
  const room = unpackPoi({ i: "osm:node:1", o: "node/1", n: "Restroom at Zilker Park", a: 30.266, g: -97.77, k: "t" });
  assert.equal(room.kind, "toilet");
  assert.equal(room.accessType, "public");
  assert.equal(room.customersOnly, false);
  assert.equal(room.unverified, true);
  assert.ok(matchesNearbyFilter(room, "toilet"));
  assert.ok(!matchesNearbyFilter(room, "gas"));
});

test("gas and grocery rows stay customers-only and verified", () => {
  const gas = unpackPoi({ i: "osm:node:2", o: "node/2", n: "Buc-ee's", a: 30, g: -97, k: "g" });
  assert.equal(gas.kind, "gas");
  assert.equal(gas.customersOnly, true);
  assert.equal(gas.unverified, undefined);
});

test("restroom tiles use 5 degree cells", () => {
  assert.deepEqual(restroomKeysForBounds({ south: 30.1, west: -97.9, north: 30.4, east: -97.6 }), ["30_-100"]);
  assert.deepEqual(restroomKeysForBounds({ south: 34.9, west: -95.1, north: 35.1, east: -94.9 }), [
    "30_-100",
    "30_-95",
    "35_-100",
    "35_-95",
  ]);
});
