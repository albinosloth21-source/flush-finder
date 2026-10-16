export const ACCESS_TYPES = ["public", "customers", "unknown"] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const SOURCES = ["osm", "user", "seed"] as const;
export type BathroomSource = (typeof SOURCES)[number];

export const VENUE_KINDS = ["toilet", "restaurant", "gas", "grocery", "park", "business", "home"] as const;
export type VenueKind = (typeof VENUE_KINDS)[number];

export const PIN_VISIBILITIES = ["public", "pending", "personal"] as const;
export type PinVisibility = (typeof PIN_VISIBILITIES)[number];

export type Bathroom = {
  id: string;
  osmId: string | null;
  name: string;
  lat: number;
  lng: number;
  accessType: AccessType;
  fee: boolean | null;
  wheelchair: boolean | null;
  address: string | null;
  source: BathroomSource;
  kind: VenueKind;
  visibility: PinVisibility;
  mine: boolean;
  avgRating: number | null;
  reviewCount: number;
  avgCleanliness: number | null;
  avgAvailability: number | null;
  avgAccessibility: number | null;
  avgAtmosphere: number | null;
  askForKey: boolean;
  customersOnly: boolean;
  hoursOpen?: string | null;
  hoursClose?: string | null;
  daysOpen?: string[];
  /** Imported from OpenStreetMap and not yet confirmed by a Flush Finder review. */
  unverified?: boolean;
};

export type Review = {
  id: string;
  bathroomId: string;
  rating: number;
  cleanliness: number;
  availability: number;
  accessibility: number;
  atmosphere: number;
  accessType: Exclude<AccessType, "unknown">;
  askForKey: boolean;
  critique: string;
  reviewerName: string;
  reviewerTitle: string | null;
  createdAt: string;
  hoursOpen: string | null;
  hoursClose: string | null;
  daysOpen: string[];
};

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
  zoom: number;
};

export type PlaceHit = {
  label: string;
  lat: number;
  lng: number;
};

export type WalkingRoute = {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

export type Reviewer = {
  userId: string;
  email: string | null;
  name: string | null;
  confirmed: boolean;
};
