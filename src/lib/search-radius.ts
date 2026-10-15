import { haversineMeters } from "./geo.ts";

export const RADIUS_MILES = [1, 2, 5, 10] as const;
export type RadiusMiles = (typeof RADIUS_MILES)[number];
export const DEFAULT_RADIUS_MILES: RadiusMiles = 2;
export const METERS_PER_MILE = 1609.344;

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export function zoomForMiles(miles: number): number {
  if (miles <= 1) return 14;
  if (miles <= 2) return 13;
  if (miles <= 5) return 12;
  return 11;
}

/** Approximate on-screen radius in CSS pixels (Web Mercator). Shrinks as you zoom out. */
export function radiusPixelsAtZoom(miles: number, zoom: number, lat = 32.33): number {
  const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  if (metersPerPx <= 0) return 0;
  return milesToMeters(miles) / metersPerPx;
}

export function boundsForRadius(
  center: { lat: number; lng: number },
  miles: number,
): { south: number; west: number; north: number; east: number } {
  const dLat = miles / 69;
  const cos = Math.cos((center.lat * Math.PI) / 180);
  const dLng = miles / (Math.max(0.2, Math.abs(cos)) * 69);
  return {
    south: center.lat - dLat,
    west: center.lng - dLng,
    north: center.lat + dLat,
    east: center.lng + dLng,
  };
}

export function pinsInRadius<T extends { lat: number; lng: number }>(
  pins: T[],
  center: { lat: number; lng: number },
  miles: number,
  cap = 220,
): T[] {
  const max = milesToMeters(miles);
  const hits: Array<{ pin: T; d: number }> = [];
  for (const pin of pins) {
    const d = haversineMeters(center, pin);
    if (d <= max) hits.push({ pin, d });
  }
  hits.sort((a, b) => a.d - b.d);
  return hits.slice(0, cap).map((hit) => hit.pin);
}

export function matchesNearbyFilter(
  room: { kind: string; visibility?: string | null; reviewCount: number },
  filter: string,
): boolean {
  if (filter === "all") return true;
  if (filter === "rated") return room.reviewCount > 0;
  if (filter === "personal") return room.visibility === "personal" || room.kind === "home";
  return room.kind === filter;
}

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export function parseDaysOpen(value: string | null | undefined): WeekDay[] {
  if (!value) return [];
  const set = new Set(WEEK_DAYS);
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is WeekDay => set.has(part as WeekDay));
}

function daysList(value: readonly string[] | string | null | undefined): WeekDay[] {
  if (!value) return [];
  return parseDaysOpen(typeof value === "string" ? value : value.join(","));
}

export function joinDaysOpen(days: string[]): string | null {
  const set = new Set(WEEK_DAYS);
  const next = days.filter((day): day is WeekDay => set.has(day as WeekDay));
  return next.length ? next.join(",") : null;
}

function labelTime(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export function formatOperatingHours(input: {
  hoursOpen?: string | null;
  hoursClose?: string | null;
  daysOpen?: readonly string[] | string | null;
}): string | null {
  const open = input.hoursOpen?.trim() || "";
  const close = input.hoursClose?.trim() || "";
  if (!open && !close) {
    const daysOnly = daysList(input.daysOpen);
    return daysOnly.length ? daysOnly.join(" · ") : null;
  }
  if (isAllDay({ hoursOpen: open, hoursClose: close })) {
    const days = daysList(input.daysOpen);
    return days.length && days.length < 7 ? `Open 24 hours · ${days.join(" · ")}` : "Open 24 hours";
  }
  const span = open && close ? `${labelTime(open)} – ${labelTime(close)}` : open ? `Opens ${labelTime(open)}` : `Closes ${labelTime(close)}`;
  const days = daysList(input.daysOpen);
  return days.length && days.length < 7 ? `${span} · ${days.join(" · ")}` : span;
}

export type HoursReport = {
  hoursOpen: string | null;
  hoursClose: string | null;
  daysOpen: readonly WeekDay[];
};

export function reportHours(
  pin?: { hoursOpen?: string | null; hoursClose?: string | null; daysOpen?: readonly string[] | string | null } | null,
  reviews?: Array<{ hoursOpen?: string | null; hoursClose?: string | null; daysOpen?: readonly string[] | string | null }>,
): HoursReport | null {
  const candidates = [pin, ...(reviews ?? [])];
  for (const item of candidates) {
    if (!item) continue;
    const hoursOpen = item.hoursOpen?.trim() || null;
    const hoursClose = item.hoursClose?.trim() || null;
    const daysOpen = daysList(item.daysOpen);
    if (hoursOpen || hoursClose || daysOpen.length) {
      return { hoursOpen, hoursClose, daysOpen };
    }
  }
  return null;
}

export function hoursFromPin(
  pin: { hoursOpen?: string | null; hoursClose?: string | null; daysOpen?: string[] | string | null },
  reviews?: Array<{ hoursOpen?: string | null; hoursClose?: string | null; daysOpen?: string[] | string | null }>,
): string | null {
  const report = reportHours(pin, reviews);
  return report ? formatOperatingHours(report) : null;
}

export function parseMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour === 24 && minute === 0) return 24 * 60;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function isAllDay(report: Pick<HoursReport, "hoursOpen" | "hoursClose">): boolean {
  const open = parseMinutes(report.hoursOpen);
  const close = parseMinutes(report.hoursClose);
  return open === 0 && (close === 0 || close === 24 * 60);
}

export function isOpenAt(report: HoursReport, at: Date): boolean | null {
  const today = WEEK_DAYS[at.getDay()];
  const nowM = at.getHours() * 60 + at.getMinutes();
  const openM = parseMinutes(report.hoursOpen);
  const closeM = parseMinutes(report.hoursClose);
  const days = report.daysOpen;
  if (isAllDay(report)) {
    if (days.length && !days.includes(today)) return false;
    return true;
  }
  if (openM == null && closeM == null) {
    if (!days.length) return null;
    return days.includes(today);
  }
  const overnight = openM != null && closeM != null && closeM <= openM;
  const activeDay =
    overnight && closeM != null && nowM < closeM ? WEEK_DAYS[(at.getDay() + 6) % 7] : today;
  if (days.length && !days.includes(activeDay)) return false;
  if (overnight) return nowM >= (openM ?? 0) || nowM < (closeM ?? 0);
  if (openM != null && closeM != null) return nowM >= openM && nowM < closeM;
  if (openM != null) return nowM >= openM;
  if (closeM != null) return nowM < closeM;
  return null;
}

export function weekSchedule(report: HoursReport): Array<{ day: WeekDay; closed: boolean; label: string }> {
  const days = report.daysOpen;
  const allDay = isAllDay(report);
  const span = formatOperatingHours({
    hoursOpen: report.hoursOpen,
    hoursClose: report.hoursClose,
    daysOpen: [],
  });
  return WEEK_DAYS.map((day) => {
    const listed = days.length === 0 || days.includes(day);
    if (!listed) return { day, closed: true, label: "Closed" };
    if (allDay) return { day, closed: false, label: "Open 24 hours" };
    if (!span) return { day, closed: false, label: "Open" };
    return { day, closed: false, label: span };
  });
}

function nextOpenLabel(report: HoursReport, at: Date): string | null {
  if (isAllDay(report)) return "Open 24 hours";
  const openLabel = report.hoursOpen ? labelTime(report.hoursOpen) : null;
  const openM = parseMinutes(report.hoursOpen);
  const nowM = at.getHours() * 60 + at.getMinutes();
  for (let i = 0; i < 7; i += 1) {
    const day = WEEK_DAYS[(at.getDay() + i) % 7];
    if (report.daysOpen.length && !report.daysOpen.includes(day)) continue;
    if (i === 0 && openM != null && nowM < openM) {
      return openLabel ? `Opens ${openLabel}` : `Opens ${day}`;
    }
    if (i === 0) continue;
    if (openLabel) return `Opens ${openLabel} ${day}`;
    return `Opens ${day}`;
  }
  return formatOperatingHours(report);
}

export function hoursStatus(
  report: HoursReport | null,
  at = new Date(),
): { state: "open" | "closed" | "unknown"; headline: string; detail: string } {
  if (!report) {
    return {
      state: "unknown",
      headline: "Hours unknown",
      detail: "Leave a review with the hours you saw on the door.",
    };
  }
  const open = isOpenAt(report, at);
  if (open == null) {
    return {
      state: "unknown",
      headline: "Hours unknown",
      detail: "Leave a review with the hours you saw on the door.",
    };
  }
  if (open) {
    return {
      state: "open",
      headline: isAllDay(report) ? "Open 24 hours" : "Open now",
      detail: formatOperatingHours(report) || "Reported open in reviews",
    };
  }
  return {
    state: "closed",
    headline: "Closed now",
    detail: nextOpenLabel(report, at) || "Reported closed in reviews",
  };
}
