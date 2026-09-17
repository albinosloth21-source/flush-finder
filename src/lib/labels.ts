import { formatToiletScore } from "./toilet-score";
import type { AccessType, VenueKind } from "./types";

export const ACCESS_OPTIONS: { value: Exclude<AccessType, "unknown">; label: string; hint: string }[] = [
  { value: "public", label: "Open to public", hint: "No purchase needed" },
  { value: "customers", label: "Customers only", hint: "Need to buy something" },
];

export const RATING_ASPECTS = [
  { key: "cleanliness", label: "Cleanliness", captions: ["Grim", "Iffy", "Acceptable", "Tidy", "Sparkling"] },
  { key: "availability", label: "Availability", captions: ["Locked", "Spotty", "Mixed", "Reliable", "Always on"] },
  { key: "accessibility", label: "Accessibility", captions: ["Blocked", "Tight", "Workable", "Easy", "Step-free"] },
  { key: "atmosphere", label: "Atmosphere", captions: ["Grim", "Awkward", "Neutral", "Pleasant", "Inviting"] },
] as const;

export type RatingAspectKey = (typeof RATING_ASPECTS)[number]["key"];

export function accessLabel(type: AccessType): string {
  if (type === "public") return "Open to public";
  if (type === "customers") return "Customers only";
  return "Access unknown";
}

export function aspectCaption(key: RatingAspectKey, value: number | null): string {
  if (value == null) return "Unrated";
  const aspect = RATING_ASPECTS.find((item) => item.key === key);
  return aspect?.captions[Math.round(value) - 1] ?? "Unrated";
}

export function ratingCaption(avg: number | null, count: number): string {
  if (avg == null || count === 0) return "No ratings yet";
  const noun = count === 1 ? "review" : "reviews";
  return `${formatToiletScore(avg)} · ${count} ${noun}`;
}

export const VENUE_LABELS: Record<VenueKind, string> = {
  toilet: "Public restroom",
  restaurant: "Restaurant",
  gas: "Gas station",
  grocery: "Grocery",
  park: "Park",
  business: "Business",
};

export const VENUE_HINTS: Record<VenueKind, string> = {
  toilet: "Dedicated public stall",
  restaurant: "Restroom for customers",
  gas: "Ask inside or use a key",
  grocery: "Usually at the back",
  park: "Park facility",
  business: "Customers or visitors",
};

export const REMOVE_REASONS = [
  { value: "gone", label: "No longer here" },
  { value: "closed", label: "Permanently closed" },
  { value: "no_restroom", label: "No restroom" },
  { value: "unavailable", label: "Unavailable to the public" },
] as const;
