const WORSHIP_NAME =
  /\b(church|chapel|cathedral|mosque|synagogue|parish|basilica|tabernacle|kingdom hall|place of worship|ministries|baptist|methodist|presbyterian|lutheran|catholic church|lds|latter[- ]day|mosque|masjid|gurdwara)\b/i;

export function isWorshipVenue(
  name: string | null | undefined,
  extra?: { amenity?: string | null; kind?: string | null },
): boolean {
  if ((extra?.amenity ?? "").toLowerCase() === "place_of_worship") return true;
  const text = (name ?? "").trim();
  if (!text) return false;
  return WORSHIP_NAME.test(text);
}
