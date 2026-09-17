import { haversineMeters } from "./geo.ts";

export const ADD_WINDOW_MS = 20 * 60 * 1000;
export const ADD_HOLD_MS = 30 * 60 * 1000;
export const ADD_BURST_LIMIT = 4;
export const NATIONWIDE_ACCOUNTS = 5;
export const CLUSTER_METERS = 30;

export type PinVisibility = "public" | "pending" | "personal";

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

export function isVisibleOnMap(
  pin: { source: string; visibility?: PinVisibility | null; createdBy?: string | null },
  viewerId?: string | null,
): boolean {
  if (isCatalogSource(pin.source)) return true;
  if (pin.visibility === "public" || !pin.visibility) return true;
  return Boolean(viewerId && pin.createdBy && pin.createdBy === viewerId);
}

export function uniquePublicAdders(pins: { createdBy: string | null; source: string; visibility: PinVisibility; accessType: string; lat: number; lng: number }[], center: { lat: number; lng: number }): number {
  const people = new Set<string>();
  for (const pin of pins) {
    if (pin.source !== "user" || pin.visibility === "personal" || pin.accessType !== "public" || !pin.createdBy) continue;
    if (haversineMeters(center, pin) <= CLUSTER_METERS) people.add(pin.createdBy);
  }
  return people.size;
}

export function shouldApproveNationwide(uniqueAccounts: number): boolean {
  return uniqueAccounts > NATIONWIDE_ACCOUNTS;
}

export function pointsForAddedPin(nationwide: boolean, personal: boolean, addPoints = 20): number {
  if (personal || !nationwide) return 0;
  return addPoints;
}

export const ADD_SPAM_COPY =
  "Adding more than 4 bathrooms in under 20 minutes will result in temporary suspension";
