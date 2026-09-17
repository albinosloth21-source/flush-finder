export const ACCESS_TYPES = ["public", "customers", "unknown"] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];
export const SOURCES = ["osm", "user", "seed"] as const;
export type BathroomSource = (typeof SOURCES)[number];
export const VENUE_KINDS = ["toilet", "restaurant", "gas", "grocery", "park", "business"] as const;
export type VenueKind = (typeof VENUE_KINDS)[number];
export const PIN_VISIBILITIES = ["public", "pending", "personal"] as const;
export type PinVisibility = (typeof PIN_VISIBILITIES)[number];
