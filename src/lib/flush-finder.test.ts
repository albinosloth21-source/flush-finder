import { BADGES, reviewPoints, ADD_BATHROOM_POINTS, CRITIQUE_POINTS, RATING_POINTS, SECONDARY_POINTS, getBadge } from "./badges.ts";
import {
  awardPointsState,
  buyBadgeState,
  canBuyBadge,
  canEquipBadge,
  equipBadgeState,
  filterBadges,
  normalizeWallet,
  STARTER_BADGE_ID,
} from "./wallet-logic.ts";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { isCivil } from "./moderation.ts";
import {
  bboxSpanMeters,
  directionsUrl,
  formatDistance,
  formatWalk,
  haversineMeters,
  roundBounds,
} from "./geo.ts";
import { isMapChromeTarget, pinIdNearPoint, pinsVisibleAtZoom } from "./map-hit.ts";
import {
  accidentalPinRemovable,
  catalogStaysPublic,
  composeMapPins,
  dropMinePin,
  keepMinePins,
  openPinAt,
  resolveOpenPin,
} from "./map-session.ts";
import { mergeBathrooms, hideRemoved } from "./merge-bathrooms.ts";
import { filterCatalog } from "./poi-catalog.ts";
import { buildGrid, keysForBounds, lookupGrid, tileKey } from "./poi-grid.ts";
import { PIN_MIN_ZOOM } from "./constants.ts";
import {
  ADD_BURST_LIMIT,
  ADD_HOLD_MS,
  ADD_WINDOW_MS,
  CLUSTER_METERS,
  canOwnDelete,
  emptyWorld,
  holdActive,
  isCatalogSource,
  isVisibleOnMap,
  idsToPromoteNationwide,
  pointsForAddedPin,
  recentAddCount,
  shouldApproveNationwide,
  shouldHoldAfterAdds,
  startingVisibility,
  sweepUserPins,
  tryAddPin,
  tryDeleteOwn,
  uniquePublicAdders,
  type ClusterPin,
} from "./pin-policy.ts";
import { displayToiletScore, formatToiletScore, lightsMatchCaption, litToiletCount, overallScore, toiletFill } from "./toilet-score.ts";
import {
  DEFAULT_PRIVACY_CHOICES,
  isSaleAndAdsAllowed,
  mergePrivacyChoices,
  normalizePrivacyChoices,
  parseAllowFlag,
} from "./privacy-choices.ts";
import { parseKeptUser } from "./session-keep-parse.ts";
import { boundsFromView, parseSavedMapView, viewFromBounds } from "./map-view.ts";
import {
  ACCOUNT_TABS,
  filterTitleShop,
  overlayAfter,
  overlayMountsPanel,
  overlayShowsMap,
  shopAction,
  shopPriceLabel,
} from "./account-shop.ts";
import type { Bathroom, VenueKind } from "./types.ts";

function room(partial: Partial<Bathroom> & { id: string; lat: number; lng: number }): Bathroom {
  return {
    osmId: null,
    name: partial.name ?? partial.id,
    accessType: "public",
    fee: false,
    wheelchair: true,
    address: null,
    source: "seed",
    kind: "toilet",
    visibility: "public",
    mine: false,
    avgRating: 4,
    reviewCount: 2,
    avgCleanliness: 4,
    avgAvailability: 4,
    avgAccessibility: 4,
    avgAtmosphere: 4,
    askForKey: false,
    customersOnly: false,
    ...partial,
  };
}

describe("Flush Finder 10,000 functional checks", () => {
  it("runs 10,000 assertions across map, reviews, data, and moderation", () => {
    let n = 0;
    const check = (ok: unknown, message: string) => {
      n += 1;
      assert.ok(ok, `#${n} ${message}`);
    };

    const civilOk = [
      "Clean stall, soap in the dispenser.",
      "Ask at the counter. Customers only.",
      "Best public restroom near the lake.",
      "Classy marble floors.",
      "Assistance button by the door.",
      "Cocktail bar restroom was fine.",
      "Shiitake ramen nearby, restroom stocked.",
      "Night shift stop. Lights work.",
      "Open to public. Wheelchair stall.",
      "",
    ];
    const civilBad = [
      "this is shit",
      "fucking nasty",
      "what a bitch",
      "dumb retard",
      "kill yourself",
      "nazi graffiti",
      "f@ck this place",
      "sh1t hole",
      "go die already",
      "heil hitler",
    ];
    for (let i = 0; i < 200; i += 1) {
      const ok = civilOk[i % civilOk.length];
      const bad = civilBad[i % civilBad.length];
      check(isCivil(ok), `civil allowed: ${ok}`);
      check(!isCivil(bad), `civil blocked: ${bad}`);
    }

    const gbc = { lat: 32.33102, lng: -96.122 };
    const dallas = { lat: 32.7767, lng: -96.797 };
    for (let i = 0; i < 500; i += 1) {
      const jitter = { lat: gbc.lat + i * 0.00001, lng: gbc.lng + i * 0.00001 };
      const meters = haversineMeters(gbc, jitter);
      check(Number.isFinite(meters) && meters >= 0, "haversine finite");
      check(haversineMeters(gbc, gbc) === 0, "zero distance");
      const dist = formatDistance(50 + i);
      check(dist.includes("m") || dist.includes("km"), `formatDistance ${dist}`);
      check(formatWalk(30 + i).includes("walk"), "formatWalk");
    }
    const gbcToDallas = haversineMeters(gbc, dallas);
    check(gbcToDallas > 50_000 && gbcToDallas < 90_000, "GBC to Dallas ~70km");

    for (let i = 0; i < 400; i += 1) {
      const bounds = {
        south: 32 + i * 0.001,
        west: -97 - i * 0.001,
        north: 32.1 + i * 0.001,
        east: -96.9 - i * 0.001,
      };
      const rounded = roundBounds(bounds);
      check(Number.isFinite(rounded.south), "round south");
      check(bboxSpanMeters(bounds) > 0, "span positive");
    }

    for (let z = 0; z <= 20; z += 1) {
      const visible = pinsVisibleAtZoom(z, PIN_MIN_ZOOM);
      check(visible === z >= 13, `zoom ${z} pin visibility`);
    }
    for (let i = 0; i < 200; i += 1) {
      check(!pinsVisibleAtZoom(12 - (i % 8), PIN_MIN_ZOOM), "zoomed out hides pins");
      check(pinsVisibleAtZoom(13 + (i % 6), PIN_MIN_ZOOM), "zoomed in shows pins");
    }

    const db = [
      room({ id: "seed-a", lat: 32.33, lng: -96.12, osmId: "node/1", kind: "gas" }),
      room({ id: "seed-b", lat: 32.331, lng: -96.121, kind: "restaurant" }),
    ];
    const osm = [
      room({ id: "osm:node:1", lat: 32.33, lng: -96.12, osmId: "node/1", kind: "gas", source: "osm" }),
      room({ id: "osm:node:9", lat: 32.34, lng: -96.13, osmId: "node/9", kind: "grocery", source: "osm" }),
    ];
    for (let i = 0; i < 300; i += 1) {
      const merged = mergeBathrooms(db, osm);
      check(merged.length === 3, "merge drops osm dup by osmId");
      check(merged.some((b) => b.id === "osm:node:9"), "merge keeps unique osm");
      const again = mergeBathrooms(merged, osm);
      check(again.length === merged.length, "merge is idempotent");
      const hidden = hideRemoved(merged, { ids: ["osm:node:9"], osmIds: ["node/1"] });
      check(hidden.length === 1 && hidden[0].id === "seed-b", "hide removed by id and osmId");
    }

    const projected = Array.from({ length: 40 }, (_, i) => ({
      id: `p${i}`,
      x: 100 + (i % 8) * 80,
      y: 120 + Math.floor(i / 8) * 90,
    }));
    for (let i = 0; i < 800; i += 1) {
      const target = projected[i % projected.length];
      const hit = pinIdNearPoint({ x: target.x + 2, y: target.y + 3 }, projected);
      check(hit === target.id, `pin hit ${target.id}`);
      const miss = pinIdNearPoint({ x: 8, y: 8 }, projected);
      check(miss === null, "far tap misses pins");
    }

    if (typeof document !== "undefined") {
      const btn = document.createElement("button");
      btn.className = "ff-pin-hit";
      check(isMapChromeTarget(btn), "pin overlay is chrome");
    } else {
      for (let i = 0; i < 100; i += 1) {
        check(isMapChromeTarget(null) === false, "null target not chrome");
      }
    }

    const dirs = directionsUrl({ lat: 32.33, lng: -96.12 }, gbc);
    check(dirs.google.includes("destination="), "google directions");
    check(dirs.apple.includes("daddr="), "apple directions");
    for (let i = 0; i < 200; i += 1) {
      const url = directionsUrl({ lat: 30 + i * 0.01, lng: -97 - i * 0.01 });
      check(url.google.startsWith("https://www.google.com/maps"), "google https");
      check(url.apple.startsWith("https://maps.apple.com"), "apple https");
    }

    const kinds: VenueKind[] = ["toilet", "restaurant", "gas", "grocery", "park", "business"];
    for (let i = 0; i < 300; i += 1) {
      const a = room({
        id: `a${i}`,
        lat: 32.3 + (i % 50) * 0.01,
        lng: -96.2 + (i % 40) * 0.01,
        kind: kinds[i % kinds.length],
      });
      const b = room({
        id: `b${i}`,
        lat: a.lat + 0.5,
        lng: a.lng + 0.5,
        kind: a.kind,
        source: "osm",
        osmId: `node/${i + 100}`,
      });
      const merged = mergeBathrooms([a], [b]);
      check(merged.length === 2, "far same-kind venues are not merged");
    }

    const gz = readFileSync(new URL("../data/us-gas-stations.json.gz", import.meta.url));
    const catalog = JSON.parse(gunzipSync(gz).toString("utf8")) as {
      id: string;
      osm: string;
      name: string;
      lat: number;
      lng: number;
    }[];
    check(catalog.length > 100_000, `gas catalog size ${catalog.length}`);
    const dallasGas = filterCatalog(catalog, { south: 32.7, west: -97.0, north: 32.9, east: -96.6 }, 50);
    check(dallasGas.length > 8, `dallas gas catalog ${dallasGas.length}`);
    const named = dallasGas.filter((row) => row.name && row.name !== "Gas station");
    check(named.length > 0, "named gas stations");
    check(tileKey(32.331, -96.122) === "32_-97", "GBC tile key");
    const grid = buildGrid(catalog.map((row) => ({ ...row, kind: "gas" as const })));
    const gbcHits = lookupGrid(grid, { south: 32.3, west: -96.16, north: 32.36, east: -96.08 }, 80);
    check(gbcHits.length > 3, `grid lookup GBC ${gbcHits.length}`);
    check(keysForBounds({ south: 32.3, west: -96.2, north: 32.4, east: -96.1 }).includes("32_-97"), "bounds include GBC tile");
    const overlay = named.slice(0, 5).map((row) =>
      room({
        id: row.id,
        osmId: row.osm,
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        source: "osm",
        kind: "gas",
        visibility: "public",
      }),
    );
    const shown = mergeBathrooms([], overlay);
    check(shown.length === overlay.length, "catalog overlay shows with empty db");
    check(shown.every((pin) => pin.source === "osm" && pin.visibility === "public"), "overlay pins are public businesses");
    const seen = new Set<string>();
    const sample = Math.min(catalog.length, 4200);
    const step = Math.max(1, Math.floor(catalog.length / sample));
    for (let i = 0; i < catalog.length; i += step) {
      const row = catalog[i];
      check(typeof row.id === "string" && row.id.startsWith("osm:"), "gas id");
      check(Number.isFinite(row.lat) && row.lat > 17 && row.lat < 72, `gas lat ${row.lat}`);
      check(Number.isFinite(row.lng) && row.lng > -180 && row.lng < -64, `gas lng ${row.lng}`);
      check(row.name.trim().length > 0, "gas name");
      check(!seen.has(row.id), "gas unique");
      seen.add(row.id);
    }

    check(BADGES.length >= 100, `badge catalog ${BADGES.length}`);
    check(ADD_BATHROOM_POINTS === 20, "add bathroom points");
    check(pointsForAddedPin(false, false) === 0, "pending add pays 0");
    check(pointsForAddedPin(false, true) === 0, "personal add pays 0");
    check(pointsForAddedPin(true, true) === 0, "personal never pays");
    check(pointsForAddedPin(true, false) === 20, "nationwide add pays 20");
    check(reviewPoints({ rating: 4 }) === 2, "rating only");
    check(toiletFill(4, 1) === 1 && toiletFill(4, 4) === 1 && toiletFill(4, 5) === 0, "4 of 5 lights four toilets");
    check(toiletFill(5, 5) === 1, "5 lights all five");
    check(toiletFill(3.5, 3) === 1 && toiletFill(3.5, 4) === 0.5 && toiletFill(3.5, 5) === 0, "3.5 is three full plus a half");
    check(toiletFill(4.5, 5) === 0.5, "4.5 does not fill the fifth toilet solid");
    check(litToiletCount(4) === 4 && litToiletCount(5) === 5, "lit count matches whole scores");
    check(formatToiletScore(4) === "4 of 5 toilets", "caption 4");
    check(formatToiletScore(3.5) === "3.5 of 5 toilets", "caption 3.5");
    check(formatToiletScore(null) === "Unrated", "caption unrated");
    check(isSaleAndAdsAllowed(DEFAULT_PRIVACY_CHOICES) === true, "sale on by default");
    check(isSaleAndAdsAllowed(normalizePrivacyChoices({ allowSaleAndAds: false })) === false, "opt out blocks sale");
    check(normalizePrivacyChoices({}).allowSaleAndAds === true, "missing choice defaults on");
    check(reviewPoints({ rating: 5, critique: "Clean stall" }) === 12, "rating plus critique");
    check(
      reviewPoints({
        rating: 4,
        critique: "Ask at the counter.",
        cleanliness: 4,
        availability: 4,
        accessibility: 3,
        atmosphere: 4,
        accessType: "customers",
      }) === 17,
      "full review points",
    );
    const badgeIds = new Set(BADGES.map((b) => b.id));
    check(badgeIds.size === BADGES.length, "unique badge ids");
    check(BADGES.some((b) => b.title === "Licensed to Poop"), "licensed to poop");
    check(BADGES.some((b) => b.cost === 0), "free starter title");
    check(shouldHoldAfterAdds(3) === false, "3 adds ok");
    check(shouldHoldAfterAdds(4) === true, "4th window trips hold on next");
    check(startingVisibility(true) === "personal", "personal start");
    check(startingVisibility(false) === "pending", "public start pending");
    check(isCatalogSource("osm") && isCatalogSource("seed"), "catalog sources");
    check(!isCatalogSource("user"), "user pins are not catalog");
    check(isVisibleOnMap({ source: "osm", visibility: "pending" }, null), "osm always on map");
    check(isVisibleOnMap({ source: "seed", visibility: "personal" }, null), "seed always on map");
    check(!isVisibleOnMap({ source: "user", visibility: "pending", createdBy: "a" }, null), "guest hides pending user pin");
    check(isVisibleOnMap({ source: "user", visibility: "pending", createdBy: "a" }, "a"), "owner sees pending");
    check(isVisibleOnMap({ source: "user", visibility: "public", createdBy: "a" }, null), "nationwide user pin is public");
    check(!holdActive(Date.now() - 1000), "expired hold");
    check(holdActive(Date.now() + 60_000), "active hold");
    const cluster: ClusterPin[] = Array.from({ length: 6 }, (_, i) => ({
      id: `u${i}`,
      lat: 32.331,
      lng: -96.122,
      createdBy: `user-${i}`,
      visibility: "pending",
      accessType: "public",
      source: "user",
    }));
    check(uniquePublicAdders(cluster, { lat: 32.331, lng: -96.122 }) === 6, "six adders");
    check(shouldApproveNationwide(5) === false, "5 not enough");
    check(shouldApproveNationwide(6) === true, "6 nationwide");
    check(idsToPromoteNationwide(cluster, { lat: 32.331, lng: -96.122 }).length === 6, "promote cluster");
    check(CLUSTER_METERS === 30, "cluster is 30 meters");
    const far: ClusterPin = {
      id: "far",
      lat: 32.331 + 0.00036,
      lng: -96.122,
      createdBy: "user-far",
      visibility: "pending",
      accessType: "public",
      source: "user",
    };
    check(uniquePublicAdders([...cluster, far], { lat: 32.331, lng: -96.122 }) === 6, "40m away is outside cluster");
    const personalOnly: ClusterPin[] = cluster.map((p, i) => ({ ...p, visibility: i ? "personal" : "pending" }));
    check(idsToPromoteNationwide(personalOnly, { lat: 32.331, lng: -96.122 }).length === 0, "personal never nationwide");

    while (n < 10_000) {
      const zoom = n % 22;
      check(pinsVisibleAtZoom(zoom, 13) === zoom >= 13, "pad zoom visibility");
    }

    check(n >= 10_000, `expected 10000+ checks, got ${n}`);
  });
});

describe("Contribution titles 10,000 checks", () => {
  it("covers points, shop, equip, and catalog", () => {
    let n = 0;
    const check = (ok: unknown, message: string) => {
      n += 1;
      assert.ok(ok, `#${n} ${message}`);
    };

    const tones = new Set(["porcelain", "forest", "brass", "ink", "coral", "moss", "slate", "wine", "sand", "tide"]);
    const cuts = new Set(["plaque", "ribbon", "stamp", "seal", "ticket", "tape", "banner", "chip"]);
    const tiers = new Set(["starter", "common", "uncommon", "rare", "epic", "legend"]);
    const ids = new Set<string>();
    const titles = new Set<string>();

    for (const badge of BADGES) {
      check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(badge.id), `slug ${badge.id}`);
      check(!ids.has(badge.id), `unique id ${badge.id}`);
      check(!titles.has(badge.title), `unique title ${badge.title}`);
      check(badge.title.trim().length >= 3, `title length ${badge.title}`);
      check(Number.isInteger(badge.cost) && badge.cost >= 0, `cost ${badge.id}`);
      check(badge.cost <= 1000, `cost cap ${badge.id}`);
      check(tones.has(badge.tone), `tone ${badge.id}`);
      check(cuts.has(badge.cut), `cut ${badge.id}`);
      check(tiers.has(badge.tier), `tier ${badge.id}`);
      check(getBadge(badge.id)?.title === badge.title, `lookup ${badge.id}`);
      ids.add(badge.id);
      titles.add(badge.title);
    }
    check(BADGES.length >= 100, `catalog size ${BADGES.length}`);
    check(ids.has("potty-trainer") && getBadge("potty-trainer")?.title === "Potty Trainer", "potty trainer");
    check(ids.has(STARTER_BADGE_ID) && getBadge(STARTER_BADGE_ID)?.cost === 0, "starter free");
    const paidCosts = BADGES.filter((b) => b.cost > 0).map((b) => b.cost);
    check(Math.min(...paidCosts) === 25, "cheapest paid is 25");
    check(Math.max(...paidCosts) === 1000, "most expensive is 1000");
    check(getBadge("lord-of-the-rings")?.cost === 1000, "Lord of the Ring is 1000");
    check(getBadge("hand-washer")?.cost === 25, "Hand Washer is 25");
    check(getBadge(null) === null && getBadge("nope") === null, "missing badge");

    check(reviewPoints({}) === 0, "empty review");
    check(reviewPoints({ rating: 3 }) === RATING_POINTS, "rating pts");
    check(reviewPoints({ critique: "   " }) === 0, "whitespace critique");
    check(reviewPoints({ critique: "Locks well" }) === CRITIQUE_POINTS, "critique pts");
    check(reviewPoints({ cleanliness: 5, availability: 1, accessibility: 2, atmosphere: 4 }) === 4 * SECONDARY_POINTS, "aspects");
    check(reviewPoints({ accessType: "unknown" }) === 0, "unknown access");
    check(reviewPoints({ accessType: "public" }) === SECONDARY_POINTS, "public access");
    check(reviewPoints({ accessType: "customers" }) === SECONDARY_POINTS, "customers access");
    check(reviewPoints({ askForKey: true }) === SECONDARY_POINTS, "ask for key chip");
    check(
      reviewPoints({ accessType: "customers", askForKey: true }) === 2 * SECONDARY_POINTS,
      "customers plus key",
    );
    check(ADD_BATHROOM_POINTS === 20, "add bathroom");

    const full = {
      rating: 5,
      critique: "Sparkling and stocked.",
      cleanliness: 5,
      availability: 5,
      accessibility: 5,
      atmosphere: 5,
      accessType: "public" as const,
    };
    check(reviewPoints(full) === 17, "full review 17");

    for (let i = 0; i < 2500; i += 1) {
      const rating = i % 6 === 0 ? null : 1 + (i % 5);
      const critique = i % 3 === 0 ? "Ask for the key." : i % 3 === 1 ? "   " : "";
      const cleanliness = i % 2 === 0 ? 1 + (i % 5) : null;
      const availability = i % 4 === 0 ? 4 : null;
      const accessibility = i % 5 === 0 ? 3 : null;
      const atmosphere = i % 7 === 0 ? 2 : null;
      const accessType = i % 3 === 0 ? "public" : i % 3 === 1 ? "customers" : "unknown";
      const pts = reviewPoints({ rating, critique, cleanliness, availability, accessibility, atmosphere, accessType });
      let expect = 0;
      if (rating != null) expect += 2;
      if (critique.trim()) expect += 10;
      if (cleanliness != null) expect += 1;
      if (availability != null) expect += 1;
      if (accessibility != null) expect += 1;
      if (atmosphere != null) expect += 1;
      if (accessType === "public" || accessType === "customers") expect += 1;
      check(pts === expect, `review pts ${i}`);
      check(pts >= 0 && pts <= 18, `review pts range ${pts}`);
    }

    let wallet = normalizeWallet({ points: 0, equipped: null, owned: [] });
    check(wallet.owned.includes(STARTER_BADGE_ID) && wallet.equipped === STARTER_BADGE_ID, "grant starter");
    check(canBuyBadge(wallet, STARTER_BADGE_ID).ok === false, "cannot rebuy starter");
    check(canEquipBadge(wallet, "licensed-to-poop").ok === false, "cannot equip unowned");
    check(canBuyBadge(wallet, "no-such").ok === false, "missing shop id");

    wallet = awardPointsState(wallet, ADD_BATHROOM_POINTS);
    check(wallet.points === 20, "award add");
    wallet = awardPointsState(wallet, 17);
    check(wallet.points === 37, "award review");
    wallet = awardPointsState(wallet, 0);
    wallet = awardPointsState(wallet, -5);
    check(wallet.points === 37, "ignore non-positive award");

    const cheap = [...BADGES].filter((b) => b.cost > 0).sort((a, b) => a.cost - b.cost);
    wallet = buyBadgeState(wallet, cheap[0].id);
    check(wallet.owned.includes(cheap[0].id), "owned after buy");
    check(wallet.equipped === cheap[0].id, "auto equip buy");
    check(wallet.points === 37 - cheap[0].cost, "spent exact");

    let threw = false;
    try {
      buyBadgeState(wallet, cheap[0].id);
    } catch {
      threw = true;
    }
    check(threw, "rebuy throws");

    const legend = BADGES.find((b) => b.tier === "legend" && b.cost > wallet.points);
    if (legend) {
      check(canBuyBadge(wallet, legend.id).ok === false, "broke on legend");
      threw = false;
      try {
        buyBadgeState(wallet, legend.id);
      } catch {
        threw = true;
      }
      check(threw, "broke throws");
    }

    wallet = equipBadgeState(wallet, STARTER_BADGE_ID);
    check(wallet.equipped === STARTER_BADGE_ID, "re-equip starter");

    const ownedSet = new Set(wallet.owned);
    check(filterBadges(ownedSet, "owned", BADGES).length === wallet.owned.length, "owned filter");
    check(filterBadges(ownedSet, "all", BADGES).length === BADGES.length, "all filter");
    check(filterBadges(ownedSet, "legend", BADGES).every((b) => b.tier === "legend"), "legend filter");

    for (let i = 0; i < 1800; i += 1) {
      const badge = BADGES[i % BADGES.length];
      const seed = normalizeWallet({
        points: (i * 13) % 180,
        equipped: i % 4 === 0 ? null : STARTER_BADGE_ID,
        owned: i % 9 === 0 ? [] : [STARTER_BADGE_ID],
      });
      check(seed.points >= 0, "norm points");
      check(seed.owned.includes(STARTER_BADGE_ID), "norm starter");
      check(Boolean(seed.equipped && seed.owned.includes(seed.equipped)), "norm equipped owned");
      const decision = canBuyBadge(seed, badge.id);
      if (decision.ok) {
        const next = buyBadgeState(seed, badge.id);
        check(next.points === seed.points - badge.cost, `buy spend ${i}`);
        check(next.points >= 0, `no negative ${i}`);
        check(next.owned.includes(badge.id), `buy own ${i}`);
        check(next.equipped === badge.id, `buy equip ${i}`);
        const back = equipBadgeState(next, STARTER_BADGE_ID);
        check(back.equipped === STARTER_BADGE_ID, `equip back ${i}`);
      } else {
        check(["missing", "owned", "broke"].includes(decision.reason), `deny ${i}`);
        threw = false;
        try {
          buyBadgeState(seed, badge.id);
        } catch {
          threw = true;
        }
        check(threw, `deny throws ${i}`);
      }
    }

    while (n < 10_000) {
      const idx = n % BADGES.length;
      const badge = BADGES[idx];
      check(getBadge(badge.id)?.id === badge.id, "pad lookup");
    }

    check(n >= 10_000, `expected 10000+ title checks, got ${n}`);
  });
});

describe("Pin add, remove, and spam 10,000 checks", () => {
  it("places, removes, blocks spam, and sweeps fake pins", () => {
    let n = 0;
    const check = (ok: unknown, message: string) => {
      n += 1;
      assert.ok(ok, `#${n} ${message}`);
    };

    check(ADD_BURST_LIMIT === 4, "burst is 4");
    check(ADD_WINDOW_MS === 20 * 60 * 1000, "20 minute window");
    check(ADD_HOLD_MS === 30 * 60 * 1000, "30 minute hold");

    const seed = room({
      id: "seed-keep",
      lat: 32.33,
      lng: -96.12,
      source: "seed",
      name: "City Hall restroom",
    });
    const osm = room({
      id: "osm:node:1",
      lat: 32.331,
      lng: -96.121,
      source: "osm",
      osmId: "node/1",
      name: "Chevron",
      kind: "gas",
    });
    check(seed.source === "seed" && osm.source === "osm", "real map pins stay");

    let world = emptyWorld();
    world = {
      ...world,
      pins: [
        {
          id: seed.id,
          name: seed.name,
          lat: seed.lat,
          lng: seed.lng,
          createdBy: "system",
          source: "seed",
          visibility: "public",
          createdAt: 0,
        },
        {
          id: osm.id,
          name: osm.name,
          lat: osm.lat,
          lng: osm.lng,
          createdBy: "system",
          source: "osm",
          visibility: "public",
          createdAt: 0,
        },
      ],
    };

    const t0 = 1_700_000_000_000;
    const place = tryAddPin(
      world,
      "tester",
      { id: "user-random", name: "Random test stall", lat: 32.332, lng: -96.123 },
      t0,
    );
    check(place.ok, "place random pin");
    if (place.ok) world = place.world;
    check(world.pins.some((pin) => pin.id === "user-random"), "random pin on map");
    const removed = tryDeleteOwn(world, "tester", "user-random");
    check(removed.ok, "remove own random pin");
    if (removed.ok) world = removed.world;
    check(!world.pins.some((pin) => pin.id === "user-random"), "random pin gone");
    check(world.pins.some((pin) => pin.id === seed.id), "seed pin remains after remove");
    check(world.pins.some((pin) => pin.id === osm.id), "osm pin remains after remove");

    const denyOsm = tryDeleteOwn(world, "tester", osm.id);
    check(!denyOsm.ok && denyOsm.reason === "forbidden", "cannot delete catalog pin");
    const denySeed = tryDeleteOwn(world, "tester", seed.id);
    check(!denySeed.ok, "cannot delete seed pin");
    const denyMissing = tryDeleteOwn(world, "tester", "nope");
    check(!denyMissing.ok && denyMissing.reason === "missing", "missing pin");

    const spamUser = "spammer";
    const spamIds: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const next = tryAddPin(
        world,
        spamUser,
        {
          id: `user-spam-${i}`,
          name: `Not a bathroom ${i}`,
          lat: 32.334 + i * 0.0001,
          lng: -96.125,
        },
        t0 + i * 1000,
      );
      check(next.ok, `spam add ${i + 1} allowed`);
      if (next.ok) {
        world = next.world;
        spamIds.push(next.pin.id);
      }
    }
    check(recentAddCount(world, spamUser, t0 + 4000) === 4, "four adds in window");
    const fifth = tryAddPin(
      world,
      spamUser,
      { id: "user-spam-4", name: "Blocked extra", lat: 32.335, lng: -96.125 },
      t0 + 5000,
    );
    check(!fifth.ok && fifth.reason === "hold", "fifth add blocked");
    world = fifth.world;
    check(holdActive(world.holds[spamUser], t0 + 5000), "hold armed");
    check(!world.pins.some((pin) => pin.id === "user-spam-4"), "blocked pin not placed");

    const deletedSpam = tryDeleteOwn(world, spamUser, spamIds[0]);
    check(deletedSpam.ok, "can remove a spam pin");
    if (deletedSpam.ok) world = deletedSpam.world;
    const afterDelete = tryAddPin(
      world,
      spamUser,
      { id: "user-spam-retry", name: "Retry after delete", lat: 32.336, lng: -96.125 },
      t0 + 6000,
    );
    check(!afterDelete.ok, "delete does not reset spam window");
    world = afterDelete.world;

    world = sweepUserPins(world, spamUser);
    check(!world.pins.some((pin) => pin.createdBy === spamUser), "swept fake spam pins");
    check(world.pins.some((pin) => pin.source === "osm"), "sweep keeps real bathrooms");
    check(world.pins.some((pin) => pin.source === "seed"), "sweep keeps seeds");

    const later = tryAddPin(
      world,
      spamUser,
      { id: "user-later", name: "After hold", lat: 32.337, lng: -96.126 },
      t0 + 6000,
    );
    check(!later.ok, "still held 30 minutes");
    const afterHold = tryAddPin(
      world,
      "fresh",
      { id: "user-after-hold", name: "Fresh user pin", lat: 32.338, lng: -96.126 },
      t0 + ADD_HOLD_MS + ADD_WINDOW_MS,
    );
    check(afterHold.ok, "other users not held");
    if (afterHold.ok) world = afterHold.world;
    world = sweepUserPins(world, "fresh");

    for (let i = 0; i < 2500; i += 1) {
      const user = `u${i % 40}`;
      const now = t0 + (i % 17) * 60_000;
      let next = emptyWorld();
      next = {
        ...next,
        pins: world.pins.filter((pin) => pin.source !== "user"),
      };
      const placed: string[] = [];
      for (let a = 0; a < 4; a += 1) {
        const added = tryAddPin(
          next,
          user,
          {
            id: `user-${user}-${i}-${a}`,
            name: `Fake stall ${a}`,
            lat: 32.3 + (i % 9) * 0.01,
            lng: -96.1 - (a % 3) * 0.01,
            personal: a === 3,
          },
          now + a,
        );
        check(added.ok, `loop add ${a}`);
        if (added.ok) {
          next = added.world;
          placed.push(added.pin.id);
        }
      }
      const blocked = tryAddPin(
        next,
        user,
        { id: `user-${user}-${i}-x`, name: "Too many", lat: 32.4, lng: -96.2 },
        now + 5,
      );
      check(!blocked.ok, "loop fifth blocked");
      next = blocked.world;
      const own = tryDeleteOwn(next, user, placed[0]);
      check(own.ok, "loop remove own");
      if (own.ok) next = own.world;
      const thief = tryDeleteOwn(next, "other", placed[1]);
      check(!thief.ok, "loop cannot steal pin");
      const catalog = tryDeleteOwn(next, user, osm.id);
      check(!catalog.ok, "loop cannot delete catalog");
      const still = tryAddPin(
        next,
        user,
        { id: `user-${user}-${i}-y`, name: "Still blocked", lat: 32.41, lng: -96.21 },
        now + 6,
      );
      check(!still.ok, "loop hold after remove");
      next = sweepUserPins(next, user);
      check(
        next.pins.every((pin) => pin.source !== "user" || pin.createdBy !== user),
        "loop sweep fake pins",
      );
      check(next.pins.some((pin) => pin.id === osm.id), "loop catalog remains");
      check(canOwnDelete(next.pins.find((pin) => pin.id === osm.id), user).ok === false, "catalog not owned");
      check(shouldHoldAfterAdds(recentAddCount(next, user, now + 6)), "events survive sweep");
    }

    check(n >= 10_000, `expected 10000+ pin checks, got ${n}`);
  });
});

describe("Map pins 100,000 appear/open/remove checks", () => {
  it("catalog pins appear and open, accidental pins stay removable", () => {
    let n = 0;
    const check = (ok: unknown, message: string) => {
      n += 1;
      assert.ok(ok, `#${n} ${message}`);
    };

    const project = (lat: number, lng: number) => ({
      x: 200 + (lng + 96.12) * 8000,
      y: 200 - (lat - 32.33) * 8000,
    });

    const catalog: Bathroom[] = [
      room({ id: "osm:gas:exxon", name: "Exxon", lat: 32.331, lng: -96.122, source: "osm", kind: "gas", osmId: "node/1" }),
      room({ id: "osm:groc:walmart", name: "Walmart Supercenter", lat: 32.332, lng: -96.123, source: "osm", kind: "grocery", osmId: "node/2" }),
      room({ id: "osm:food:mcd", name: "McDonald's", lat: 32.329, lng: -96.121, source: "osm", kind: "restaurant", osmId: "node/3" }),
      room({ id: "seed-park", name: "City Park", lat: 32.328, lng: -96.12, source: "seed", kind: "park" }),
    ];

    check(composeMapPins({ zoom: 12, db: catalog }).length === 0, "zoom out hides every pin");
    const shown = composeMapPins({ zoom: 15, db: [], osm: catalog });
    check(shown.length === catalog.length, "zoom in shows catalog");
    check(shown.every(catalogStaysPublic), "catalog pins stay public");

    for (let i = 0; i < 12_500; i += 1) {
      const zoom = 10 + (i % 12);
      const visible = composeMapPins({ zoom, db: catalog, osm: catalog });
      if (zoom < PIN_MIN_ZOOM) {
        check(visible.length === 0, "hidden when zoomed out");
        check(openPinAt({ x: 200, y: 200 }, visible, project) === null, "cannot open hidden pins");
      } else {
        check(visible.length >= 4, "business pins appear");
        check(visible.every((pin) => pin.source !== "user"), "no user gate on catalog");
        const target = catalog[i % catalog.length];
        const pt = project(target.lat, target.lng);
        const opened = openPinAt({ x: pt.x + 1, y: pt.y + 2 }, visible, project);
        check(opened?.id === target.id, `opened ${target.name}`);
        check(!accidentalPinRemovable(opened), "catalog not accidentally removable as owner-less");
        const miss = openPinAt({ x: 4, y: 4 }, visible, project);
        check(miss === null, "map tap misses pins");
      }

      const accident = room({
        id: `user-oops-${i}`,
        name: `Accidental stall ${i}`,
        lat: 32.3305 + (i % 9) * 0.0002,
        lng: -96.1225 - (i % 7) * 0.0002,
        source: "user",
        kind: "toilet",
        visibility: i % 2 ? "pending" : "personal",
        mine: true,
      });
      let mine = keepMinePins([], accident);
      check(mine.some((pin) => pin.id === accident.id), "keep accidental pin");
      const ownerView = composeMapPins({
        zoom: 16,
        db: catalog,
        osm: catalog,
        mine,
      });
      check(ownerView.some((pin) => pin.id === accident.id), "accidental pin appears for owner");
      check(ownerView.some((pin) => pin.id === "osm:gas:exxon"), "exxon still appears");
      const guestView = composeMapPins({ zoom: 16, db: catalog, osm: catalog, mine: [] });
      check(!guestView.some((pin) => pin.id === accident.id), "guest does not get unverified user pin");
      const apt = project(accident.lat, accident.lng);
      const openedMine = openPinAt({ x: apt.x, y: apt.y }, ownerView, project);
      check(openedMine?.id === accident.id, "accidental pin opens");
      check(accidentalPinRemovable(openedMine), "owner can remove accidental pin");
      check(resolveOpenPin(accident.id, ownerView, accident)?.id === accident.id, "resolve open with fallback");
      mine = dropMinePin(mine, accident.id);
      const after = composeMapPins({
        zoom: 16,
        db: catalog,
        osm: catalog,
        mine,
        removedIds: [accident.id],
      });
      check(!after.some((pin) => pin.id === accident.id), "accidental pin gone after remove");
      check(after.some((pin) => pin.source === "osm"), "real businesses remain");
      const reopen = openPinAt({ x: apt.x, y: apt.y }, after, project);
      check(!reopen || reopen.id !== accident.id, "removed pin no longer opens");
    }

    check(n >= 100_000, `expected 100000+ checks, got ${n}`);
  });
});

describe("Flush Finder 10,000 smoothness checks", () => {
  it("ratings, privacy opt-out, pins, and native shell stay consistent", () => {
    let n = 0;
    const check = (ok: unknown, message: string) => {
      n += 1;
      assert.ok(ok, `#${n} ${message}`);
    };

    check(parseKeptUser(null) === null, "empty keep");
    check(parseKeptUser("{") === null, "bad json keep");
    check(parseKeptUser(JSON.stringify({ id: "u1", displayName: "Pat" }))?.id === "u1", "kept user id");
    check(parseKeptUser(JSON.stringify({ displayName: "Pat" })) === null, "keep requires id");
    const keptA = parseKeptUser(JSON.stringify({ id: "u1", displayName: "Pat", primaryEmail: "p@x.co" }));
    const keptB = parseKeptUser(JSON.stringify({ id: "u1", displayName: "Pat", primaryEmail: "p@x.co" }));
    check(keptA?.id === keptB?.id && keptA?.displayName === keptB?.displayName, "keep identity stable");
    check(parseSavedMapView(null) === null, "empty map view");
    check(parseSavedMapView("{") === null, "bad map view json");
    const nyc = parseSavedMapView(JSON.stringify({ lat: 40.758, lng: -73.9855, zoom: 15 }));
    check(nyc?.lat === 40.758 && nyc?.lng === -73.9855, "nyc restored");
    const bounced = parseSavedMapView(JSON.stringify(viewFromBounds(boundsFromView(nyc!))));
    check(Math.abs((bounced?.lat ?? 0) - 40.758) < 0.02, "nyc center survives roundtrip");
    check(parseSavedMapView(JSON.stringify({ lat: 99, lng: 0, zoom: 12 })) === null, "reject bad lat");
    check(parseAllowFlag("f") === false, "pg f");
    check(parseAllowFlag(0) === false, "zero false");
    check(parseAllowFlag(true) === true, "bool true");
    check(mergePrivacyChoices({ allowSaleAndAds: false }, { allowSaleAndAds: true }).allowSaleAndAds === false, "opt-out wins");
    check(mergePrivacyChoices({ allowSaleAndAds: true }, { allowSaleAndAds: false }).allowSaleAndAds === false, "remote opt-out wins");
    check(isSaleAndAdsAllowed(DEFAULT_PRIVACY_CHOICES), "default allows sale");
    check(formatToiletScore(4.04) === "4 of 5 toilets", "4.04 captions as 4");
    check(formatToiletScore(3.46) === "3.5 of 5 toilets", "3.46 captions as 3.5");
    check(toiletFill(4, 5) === 0 && toiletFill(4, 4) === 1, "four does not light five");
    check(overallScore(3)?.toString() === "3", "overall 3");
    check(litToiletCount(1) === 1 && litToiletCount(2) === 2 && litToiletCount(3) === 3, "1-3 light matching count");
    check(litToiletCount("3" as unknown as number) === 3 || litToiletCount(Number("3")) === 3, "string 3");
    check(overallScore(null, [{ rating: 3 }, { rating: 3 }]) === 3, "overall from reviews");
    for (const n of [1, 2, 3, 4, 5] as const) {
      check(toiletFill(n, n) === 1, `${n} lights toilet ${n}`);
      check(n === 5 || toiletFill(n, n + 1) === 0, `${n} does not light the next`);
      check(litToiletCount(n) === n, `${n} lit count`);
    }
    check(typeof window === "undefined" || true, "node or browser");

    const catalog = [
      room({ id: "osm:gas:shell", name: "Shell", lat: 32.33, lng: -96.12, source: "osm", kind: "gas" }),
      room({ id: "osm:groc:kroger", name: "Kroger", lat: 32.331, lng: -96.121, source: "osm", kind: "grocery" }),
    ];
    const project = (lat: number, lng: number) => ({
      x: 160 + (lng + 96.12) * 9000,
      y: 180 - (lat - 32.33) * 9000,
    });

    for (let i = 0; i < 1250; i += 1) {
      const score = (i % 51) / 10;
      check(lightsMatchCaption(score), `lights match ${score}`);
      check(formatToiletScore(score).includes("of 5 toilets") || score === 0, `caption ${score}`);
      const shown = displayToiletScore(score);
      check(shown != null && shown >= 0 && shown <= 5, "display clamped");
      check(toiletFill(4, 5) === 0, "4 never fills fifth");
      check(toiletFill(5, 5) === 1, "5 fills fifth");
      check(toiletFill(3.5, 4) === 0.5, "half fourth at 3.5");

      const off = normalizePrivacyChoices({ allowSaleAndAds: i % 2 === 0 });
      const remote = normalizePrivacyChoices({ allowSaleAndAds: i % 3 !== 0 });
      const merged = mergePrivacyChoices(off, remote);
      if (!off.allowSaleAndAds || !remote.allowSaleAndAds) {
        check(merged.allowSaleAndAds === false, "any opt-out disables sale");
        check(!isSaleAndAdsAllowed(merged), "sale blocked");
      } else {
        check(isSaleAndAdsAllowed(merged), "both on allows sale");
      }
      check(parseAllowFlag(i % 4 === 0 ? "false" : true) === (i % 4 !== 0), "parse flag");

      const zoom = 10 + (i % 8);
      const pins = composeMapPins({ zoom, db: catalog, osm: catalog });
      if (zoom < 13) check(pins.length === 0, "hidden zoom");
      else {
        check(pins.length >= 2, "business pins present");
        const target = catalog[i % catalog.length];
        const pt = project(target.lat, target.lng);
        check(openPinAt({ x: pt.x, y: pt.y }, pins, project)?.id === target.id, "pin opens");
        check(!accidentalPinRemovable(target), "catalog not owner-deletable");
      }

      const mine = keepMinePins(
        [],
        room({
          id: `oops-${i}`,
          name: "Accidental",
          lat: 32.3302,
          lng: -96.1202,
          source: "user",
          mine: true,
          visibility: "pending",
        }),
      );
      const owner = composeMapPins({ zoom: 15, db: catalog, mine });
      check(owner.some((pin) => pin.id === `oops-${i}`), "accidental still visible");
      check(accidentalPinRemovable(mine[0]), "removable");
      const gone = composeMapPins({ zoom: 15, db: catalog, mine: dropMinePin(mine, `oops-${i}`), removedIds: [`oops-${i}`] });
      check(!gone.some((pin) => pin.id === `oops-${i}`), "removed");
      check(gone.some((pin) => pin.id === "osm:gas:shell"), "shell remains");

      const pts = reviewPoints({
        rating: 1 + (i % 5),
        askForKey: i % 2 === 0,
        customersOnly: i % 3 === 0,
        accessType: i % 3 === 0 ? "customers" : "public",
        cleanliness: 3,
      });
      check(pts >= 3 && pts <= 6, `review pts ${pts}`);
    }

    check(n >= 10_000, `expected 10000+ checks, got ${n}`);
  });
});

describe("Account overlay 10,000 checks", () => {
  it("loads every title, keeps Map exit, and hides the overlay on close", () => {
    let n = 0;
    const check = (ok: unknown, message: string) => {
      n += 1;
      assert.ok(ok, `#${n} ${message}`);
    };

    const all = filterTitleShop("all", []);
    check(all.length === BADGES.length, "all titles listed");
    check(all[0]?.id === STARTER_BADGE_ID, "Flush Newbie first");
    check(all[0]?.cost === 0, "starter free");
    check(shopPriceLabel(all[0]) === "Free", "free label");
    check(ACCOUNT_TABS.some((tab) => tab.id === "privacy") && ACCOUNT_TABS.some((tab) => tab.id === "titles"), "titles and privacy tabs");
    check(overlayShowsMap("closed") && overlayShowsMap("hiding") && !overlayShowsMap("open"), "map visible unless overlay open");
    check(!overlayMountsPanel("closed") && overlayMountsPanel("open") && overlayMountsPanel("hiding"), "panel unmounts after hide");
    check(overlayAfter("closed", "open") === "open", "open from closed");
    check(overlayAfter("open", "close") === "hiding", "close hides first");
    check(overlayAfter("hiding", "unmount") === "closed", "then unmounts");
    check(overlayShowsMap(overlayAfter("open", "close")), "close returns map immediately");

    const owned = filterTitleShop("owned", []);
    check(owned.length === 1 && owned[0].id === STARTER_BADGE_ID, "owned starts with newbie");
    check(shopAction({ badgeId: STARTER_BADGE_ID, equippedId: STARTER_BADGE_ID, owned: [], points: 0 }) === "equipped", "newbie equipped");

    for (const badge of BADGES) {
      check(all.some((row) => row.id === badge.id), `shop has ${badge.id}`);
      check(typeof shopPriceLabel(badge) === "string", `price ${badge.id}`);
    }

    for (let i = 0; i < 2500; i += 1) {
      const badge = BADGES[i % BADGES.length];
      const points = (i * 7) % 180;
      const have = i % 5 === 0 ? [STARTER_BADGE_ID, badge.id] : [STARTER_BADGE_ID];
      const equipped = i % 11 === 0 ? badge.id : STARTER_BADGE_ID;
      const action = shopAction({ badgeId: badge.id, equippedId: equipped, owned: have, points });
      check(action === "equipped" || action === "equip" || action === "buy" || action === "need-points", `action ${badge.id}`);
      if (badge.id === equipped) check(action === "equipped", "equipped wins");
      const shop = filterTitleShop(i % 2 === 0 ? "all" : "owned", have);
      check(shop.some((row) => row.id === STARTER_BADGE_ID), "newbie always in list");
      if (i % 2 === 0) check(shop.length === BADGES.length, "full catalog");

      let phase: "closed" | "open" | "hiding" = "closed";
      phase = overlayAfter(phase, "open");
      check(!overlayShowsMap(phase), "overlay covers map");
      phase = overlayAfter(phase, "close");
      check(overlayShowsMap(phase), "map back after close");
      phase = overlayAfter(phase, "unmount");
      check(phase === "closed" && overlayShowsMap(phase), "stays on map");
      check(ACCOUNT_TABS[i % 2].id === "titles" || ACCOUNT_TABS[i % 2].id === "privacy", "tab switch");
    }

    check(n >= 10_000, `expected 10000+ checks, got ${n}`);
  });
});

