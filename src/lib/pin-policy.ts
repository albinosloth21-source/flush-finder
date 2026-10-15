import { haversineMeters } from "./geo.ts";

export const ADD_WINDOW_MS = 20 * 60 * 1000;
export const ADD_HOLD_MS = 30 * 60 * 1000;
export const ADD_BURST_LIMIT = 4;
export const NATIONWIDE_ACCOUNTS = 5;
export const CLUSTER_METERS = 30;

export type PinVisibility = "public" | "pending" | "personal";

export type ClusterPin = {
  id: string;
  lat: number;
  lng: number;
  createdBy: string | null;
  visibility: PinVisibility;
  accessType: string;
  source: string;
};

export function shouldHoldAfterAdds(recentCount: number): boolean {
  return recentCount >= ADD_BURST_LIMIT;
}

export function holdUntilFrom(now: number, holdMs = ADD_HOLD_MS): number {
  return now + holdMs;
}

export function holdActive(heldUntil: number | string | Date | null | undefined, now = Date.now()): boolean {
  if (heldUntil == null) return false;
  const ts = typeof heldUntil === "number" ? heldUntil : Date.parse(String(heldUntil));
  return Number.isFinite(ts) && ts > now;
}

export function startingVisibility(personal: boolean): PinVisibility {
  return personal ? "personal" : "pending";
}

export function isCatalogSource(source: string | null | undefined): boolean {
  return source === "osm" || source === "seed";
}

/** Preset park centroids are not restrooms — only user-dropped stall pins count. */
export function isPresetParkPin(pin: {
  kind?: string | null;
  source?: string | null;
  name?: string | null;
}): boolean {
  if (pin.source === "user") return false;
  if ((pin.kind ?? "") === "park") return true;
  const name = (pin.name ?? "").trim();
  if (!name) return false;
  if (/\b(restroom|toilet|stall|bathroom|lavatory)\b/i.test(name)) return false;
  return /(?:^|\s)(state park|national park|city park|county park|memorial park|olympic park|park|playground)$/i.test(
    name,
  );
}

export function isVisibleOnMap(
  pin: { source: string; visibility?: PinVisibility | null; createdBy?: string | null },
  viewerId?: string | null,
): boolean {
  if (isCatalogSource(pin.source)) return true;
  if (pin.visibility === "public" || !pin.visibility) return true;
  return Boolean(viewerId && pin.createdBy && pin.createdBy === viewerId);
}

export function pinsInCluster(pins: ClusterPin[], center: { lat: number; lng: number }, radiusM = CLUSTER_METERS): ClusterPin[] {
  return pins.filter(
    (pin) =>
      pin.source === "user" &&
      pin.visibility !== "personal" &&
      pin.accessType === "public" &&
      pin.createdBy &&
      haversineMeters(center, pin) <= radiusM,
  );
}

export function uniquePublicAdders(pins: ClusterPin[], center: { lat: number; lng: number }): number {
  const people = new Set<string>();
  for (const pin of pinsInCluster(pins, center)) {
    if (pin.createdBy) people.add(pin.createdBy);
  }
  return people.size;
}

export function shouldApproveNationwide(uniqueAccounts: number): boolean {
  return uniqueAccounts > NATIONWIDE_ACCOUNTS;
}

export function idsToPromoteNationwide(pins: ClusterPin[], center: { lat: number; lng: number }): string[] {
  if (!shouldApproveNationwide(uniquePublicAdders(pins, center))) return [];
  return pinsInCluster(pins, center).map((pin) => pin.id);
}

export function pointsForAddedPin(nationwide: boolean, personal: boolean, addPoints = 20): number {
  if (personal || !nationwide) return 0;
  return addPoints;
}

export const ADD_SPAM_COPY =
  "Adding more than 4 bathrooms in under 20 minutes will result in temporary suspension";

export type LivePin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdBy: string;
  source: "user" | "osm" | "seed";
  visibility: PinVisibility;
  createdAt: number;
};

export type PinWorld = {
  pins: LivePin[];
  events: { userId: string; at: number }[];
  holds: Record<string, number>;
};

export function recentAddCount(world: PinWorld, userId: string, now: number): number {
  return world.events.filter((event) => event.userId === userId && now - event.at < ADD_WINDOW_MS).length;
}

export function canOwnDelete(pin: LivePin | undefined, userId: string): { ok: true } | { ok: false; reason: string } {
  if (!pin) return { ok: false, reason: "missing" };
  if (pin.createdBy !== userId || pin.source !== "user") return { ok: false, reason: "forbidden" };
  return { ok: true };
}

export function tryAddPin(
  world: PinWorld,
  userId: string,
  input: { id: string; name: string; lat: number; lng: number; personal?: boolean },
  now: number,
): { ok: true; world: PinWorld; pin: LivePin } | { ok: false; world: PinWorld; reason: "hold" } {
  if (holdActive(world.holds[userId], now) || shouldHoldAfterAdds(recentAddCount(world, userId, now))) {
    return {
      ok: false,
      reason: "hold",
      world: {
        ...world,
        holds: { ...world.holds, [userId]: Math.max(world.holds[userId] ?? 0, holdUntilFrom(now)) },
      },
    };
  }
  const pin: LivePin = {
    id: input.id,
    name: input.name,
    lat: input.lat,
    lng: input.lng,
    createdBy: userId,
    source: "user",
    visibility: startingVisibility(Boolean(input.personal)),
    createdAt: now,
  };
  return {
    ok: true,
    pin,
    world: {
      ...world,
      pins: [...world.pins, pin],
      events: [...world.events, { userId, at: now }],
    },
  };
}

export function tryDeleteOwn(
  world: PinWorld,
  userId: string,
  id: string,
): { ok: true; world: PinWorld } | { ok: false; world: PinWorld; reason: string } {
  const pin = world.pins.find((row) => row.id === id);
  const allowed = canOwnDelete(pin, userId);
  if (!allowed.ok) return { ok: false, world, reason: allowed.reason };
  return { ok: true, world: { ...world, pins: world.pins.filter((row) => row.id !== id) } };
}

export function sweepUserPins(world: PinWorld, userId: string): PinWorld {
  return { ...world, pins: world.pins.filter((pin) => !(pin.source === "user" && pin.createdBy === userId)) };
}

export function emptyWorld(): PinWorld {
  return { pins: [], events: [], holds: {} };
}
