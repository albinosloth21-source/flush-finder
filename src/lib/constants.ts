export const APP_NAME = "Flush Finder";
export const APP_TAGLINE = "Local restrooms, rated in toilets.";
export const SUPPORT_EMAIL = "support@flushfinder.app";
export const OPERATOR_NAME = "Misfit Software";

export const DEFAULT_CENTER = { lat: 32.33102, lng: -96.122 };
export const DEFAULT_ZOOM = 15;
export const PIN_MIN_ZOOM = 13;

export const FEATURED_PLACES = [
  { label: "Gun Barrel City", lat: 32.33102, lng: -96.122 },
  { label: "Dallas", lat: 32.7767, lng: -96.797 },
  { label: "Fort Worth", lat: 32.7555, lng: -97.3308 },
  { label: "Houston", lat: 29.7604, lng: -95.3698 },
  { label: "Austin", lat: 30.2672, lng: -97.7431 },
  { label: "San Antonio", lat: 29.4241, lng: -98.4936 },
  { label: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { label: "San Diego", lat: 32.7157, lng: -117.1611 },
  { label: "San Francisco", lat: 37.7847, lng: -122.4094 },
  { label: "San Jose", lat: 37.3382, lng: -121.8863 },
  { label: "Seattle", lat: 47.6062, lng: -122.3321 },
  { label: "Portland", lat: 45.5152, lng: -122.6784 },
  { label: "Phoenix", lat: 33.4484, lng: -112.074 },
  { label: "Denver", lat: 39.7392, lng: -104.9903 },
  { label: "Las Vegas", lat: 36.1699, lng: -115.1398 },
  { label: "Salt Lake City", lat: 40.7608, lng: -111.891 },
  { label: "Chicago", lat: 41.8827, lng: -87.6233 },
  { label: "Detroit", lat: 42.3314, lng: -83.0458 },
  { label: "Minneapolis", lat: 44.9778, lng: -93.265 },
  { label: "Kansas City", lat: 39.0997, lng: -94.5783 },
  { label: "St. Louis", lat: 38.627, lng: -90.1994 },
  { label: "New York", lat: 40.758, lng: -73.9855 },
  { label: "Boston", lat: 42.3601, lng: -71.0589 },
  { label: "Philadelphia", lat: 39.9526, lng: -75.1652 },
  { label: "Washington, DC", lat: 38.9072, lng: -77.0369 },
  { label: "Baltimore", lat: 39.2904, lng: -76.6122 },
  { label: "Atlanta", lat: 33.749, lng: -84.388 },
  { label: "Miami", lat: 25.7617, lng: -80.1918 },
  { label: "Orlando", lat: 28.5383, lng: -81.3792 },
  { label: "Tampa", lat: 27.9506, lng: -82.4572 },
  { label: "Nashville", lat: 36.1627, lng: -86.7816 },
  { label: "New Orleans", lat: 29.9511, lng: -90.0715 },
  { label: "Charlotte", lat: 35.2271, lng: -80.8431 },
  { label: "Raleigh", lat: 35.7796, lng: -78.6382 },
  { label: "Indianapolis", lat: 39.7684, lng: -86.1581 },
  { label: "Columbus", lat: 39.9612, lng: -82.9988 },
  { label: "Cleveland", lat: 41.4993, lng: -81.6944 },
  { label: "Pittsburgh", lat: 40.4406, lng: -79.9959 },
  { label: "Cincinnati", lat: 39.1031, lng: -84.512 },
  { label: "Milwaukee", lat: 43.0389, lng: -87.9065 },
  { label: "Oklahoma City", lat: 35.4676, lng: -97.5164 },
  { label: "Albuquerque", lat: 35.0844, lng: -106.6504 },
  { label: "Honolulu", lat: 21.3069, lng: -157.8583 },
  { label: "Anchorage", lat: 61.2181, lng: -149.9003 },
] as const;

export const OSM_MAX_SPAN_M = 120_000;
