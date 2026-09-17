import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { bboxSpanMeters, haversineMeters } from "@/lib/geo";
import { mergeBathrooms, hideRemoved } from "@/lib/merge-bathrooms";
import { OSM_MAX_SPAN_M } from "@/lib/constants";
import { assertCivil } from "@/lib/moderation";
import type {
  AccessType,
  Bathroom,
  BathroomSource,
  PinVisibility,
  Review,
  PlaceHit,
  VenueKind,
  WalkingRoute,
} from "@/lib/types";

const boundsSchema = z.object({
  south: z.number(),
  west: z.number(),
  north: z.number(),
  east: z.number(),
});

const accessSchema = z.enum(["public", "customers", "unknown"]);
const reviewAccessSchema = z.enum(["public", "customers"]);
const scoreSchema = z.number().int().min(1).max(5);

type BathroomRow = {
  id: string;
  osm_id: string | null;
  name: string;
  lat: number;
  lng: number;
  access_type: AccessType;
  fee: boolean | null;
  wheelchair: boolean | null;
  address: string | null;
  source: BathroomSource;
  kind: VenueKind;
  visibility?: string | null;
  created_by?: string | null;
  avg_rating: number | string | null;
  review_count: number | string;
  avg_cleanliness: number | string | null;
  avg_availability: number | string | null;
  avg_accessibility: number | string | null;
  avg_atmosphere: number | string | null;
  ask_for_key?: boolean | number | string | null;
  customers_reviews?: number | string | null;
};

type ReviewRow = {
  id: string;
  bathroom_id: string;
  rating: number;
  cleanliness: number;
  availability: number;
  accessibility: number;
  atmosphere: number;
  access_type: Exclude<AccessType, "unknown">;
  critique: string;
  reviewer_name: string | null;
  reviewer_title: string | null;
  created_at: string;
  ask_for_key?: boolean | number | string | null;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapBathroom(row: BathroomRow, viewerId?: string | null): Bathroom {
  const reviewCount = Math.round(num(row.review_count) ?? 0);
  const rated = reviewCount > 0;
  const catalog = row.source === "osm" || row.source === "seed";
  const visibility = catalog ? "public" : ((row.visibility as PinVisibility) || "public");
  return {
    id: row.id,
    osmId: row.osm_id,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    accessType: row.access_type,
    fee: row.fee,
    wheelchair: row.wheelchair,
    address: row.address,
    source: row.source,
    kind: (row.kind as VenueKind) || "toilet",
    visibility,
    mine: Boolean(row.created_by && viewerId && row.created_by === viewerId),
    avgRating: rated ? num(row.avg_rating) : null,
    reviewCount,
    avgCleanliness: rated ? num(row.avg_cleanliness) : null,
    avgAvailability: rated ? num(row.avg_availability) : null,
    avgAccessibility: rated ? num(row.avg_accessibility) : null,
    avgAtmosphere: rated ? num(row.avg_atmosphere) : null,
    askForKey: Boolean(row.ask_for_key),
    customersOnly:
      row.access_type === "customers" ||
      (rated && Math.round(Number(row.customers_reviews) || 0) * 2 >= reviewCount),
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    bathroomId: row.bathroom_id,
    rating: row.rating,
    cleanliness: row.cleanliness,
    availability: row.availability,
    accessibility: row.accessibility,
    atmosphere: row.atmosphere,
    accessType: row.access_type,
    askForKey: Boolean(row.ask_for_key),
    critique: row.critique ?? "",
    reviewerName: row.reviewer_name?.trim() || "Verified account",
    reviewerTitle: row.reviewer_title?.trim() || null,
    createdAt: row.created_at,
  };
}

const BATHROOM_SELECT = `
  b.id, b.osm_id, b.name, b.lat, b.lng, b.access_type, b.fee, b.wheelchair,
  b.address, b.source, b.kind, b.visibility, b.created_by,
  s.avg_rating, coalesce(s.review_count, 0) as review_count,
  s.avg_cleanliness, s.avg_availability, s.avg_accessibility, s.avg_atmosphere,
  coalesce(s.ask_for_key, false) as ask_for_key,
  coalesce(s.customers_reviews, 0) as customers_reviews
`;

const STATS_JOIN = `
  left join (
    select bathroom_id,
           avg(rating)::float as avg_rating,
           count(*)::int as review_count,
           avg(cleanliness)::float as avg_cleanliness,
           avg(availability)::float as avg_availability,
           avg(accessibility)::float as avg_accessibility,
           avg(atmosphere)::float as avg_atmosphere,
           bool_or(coalesce(ask_for_key, false)) as ask_for_key,
           count(*) filter (where access_type = 'customers')::int as customers_reviews
    from reviews
    group by bathroom_id
  ) s on s.bathroom_id = b.id
`;

const REVIEW_SELECT = `
  id, bathroom_id, rating, cleanliness, availability, accessibility, atmosphere,
  access_type, coalesce(ask_for_key, false) as ask_for_key, critique, coalesce(reviewer_name, 'Verified account') as reviewer_name,
  reviewer_title, created_at::text as created_at
`;

let citySeedsPromise: Promise<void> | null = null;
async function ensureCitySeeds(sql: Awaited<ReturnType<typeof getSql>>) {
  citySeedsPromise ??= (async () => {
    await sql.query(
      `insert into bathrooms (id, name, lat, lng, access_type, fee, wheelchair, address, source) values
        ('seed-nyc-bryant', 'Bryant Park Restrooms', 40.7536, -73.9832, 'public', false, true, 'Bryant Park, New York', 'seed'),
        ('seed-nyc-library', 'New York Public Library', 40.7532, -73.9822, 'public', false, true, '476 5th Ave, New York', 'seed'),
        ('seed-nyc-grand-central', 'Grand Central Terminal', 40.7527, -73.9772, 'public', false, true, '89 E 42nd St, New York', 'seed'),
        ('seed-nyc-wsp', 'Washington Square Park', 40.7308, -73.9973, 'public', false, true, 'Washington Square, New York', 'seed'),
        ('seed-chi-millennium', 'Millennium Park', 41.8827, -87.6233, 'public', false, true, '201 E Randolph St, Chicago', 'seed'),
        ('seed-chi-cultural', 'Chicago Cultural Center', 41.8837, -87.6247, 'public', false, true, '78 E Washington St, Chicago', 'seed'),
        ('seed-atx-cityhall', 'Austin City Hall', 30.2648, -97.7472, 'public', false, true, '301 W 2nd St, Austin', 'seed'),
        ('seed-atx-republic', 'Republic Square', 30.2676, -97.7472, 'public', false, true, '422 Guadalupe St, Austin', 'seed'),
        ('seed-lon-trafalgar', 'Trafalgar Square', 51.5080, -0.1281, 'public', true, true, 'Trafalgar Square, London', 'seed'),
        ('seed-lon-library', 'British Library', 51.5299, -0.1277, 'public', false, true, '96 Euston Rd, London', 'seed'),
        ('seed-tyo-shibuya', 'Shibuya Public Restroom', 35.6595, 139.7004, 'public', false, true, 'Shibuya Crossing, Tokyo', 'seed'),
        ('seed-tyo-shinjuku', 'Shinjuku Station', 35.6896, 139.7006, 'public', false, true, 'Shinjuku Station, Tokyo', 'seed')
      on conflict (id) do nothing`,
    );
    await sql.query(
      `insert into bathrooms (id, name, lat, lng, access_type, fee, wheelchair, address, source, kind) values
        ('seed-dal-klyde', 'Klyde Warren Park', 32.7894, -96.8014, 'public', false, true, '2012 Woodall Rodgers Fwy, Dallas', 'seed', 'park'),
        ('seed-dal-northpark', 'NorthPark Center', 32.8687, -96.7734, 'customers', false, true, '8687 N Central Expy, Dallas', 'seed', 'business'),
        ('seed-fw-scat', 'Sundance Square', 32.7555, -97.3308, 'public', false, true, 'Sundance Square, Fort Worth', 'seed', 'park'),
        ('seed-hou-discovery', 'Discovery Green', 29.7543, -95.3594, 'public', false, true, '1500 McKinney St, Houston', 'seed', 'park'),
        ('seed-hou-galleria', 'The Galleria', 29.7390, -95.4630, 'customers', false, true, '5085 Westheimer Rd, Houston', 'seed', 'business'),
        ('seed-sat-riverwalk', 'River Walk', 29.4246, -98.4880, 'public', false, true, 'River Walk, San Antonio', 'seed', 'park'),
        ('seed-atx-zilker', 'Zilker Park', 30.2669, -97.7729, 'public', false, true, '2100 Barton Springs Rd, Austin', 'seed', 'park'),
        ('seed-la-grandpark', 'Grand Park', 34.0553, -118.2453, 'public', false, true, '221 S Grand Ave, Los Angeles', 'seed', 'park'),
        ('seed-la-union', 'Union Station', 34.0561, -118.2342, 'public', false, true, '800 N Alameda St, Los Angeles', 'seed', 'toilet'),
        ('seed-la-grove', 'The Grove', 34.0722, -118.3575, 'customers', false, true, '189 The Grove Dr, Los Angeles', 'seed', 'business'),
        ('seed-sd-balboa', 'Balboa Park', 32.7313, -117.1467, 'public', false, true, 'Balboa Park, San Diego', 'seed', 'park'),
        ('seed-sea-pike', 'Pike Place Market', 47.6097, -122.3421, 'public', false, true, '85 Pike St, Seattle', 'seed', 'business'),
        ('seed-pdx-pioneer', 'Pioneer Courthouse Square', 45.5186, -122.6793, 'public', false, true, '701 SW 6th Ave, Portland', 'seed', 'park'),
        ('seed-phx-civic', 'Civic Space Park', 33.4539, -112.0740, 'public', false, true, '424 N Central Ave, Phoenix', 'seed', 'park'),
        ('seed-den-civic', 'Civic Center Park', 39.7393, -104.9889, 'public', false, true, '101 W 14th Ave Pkwy, Denver', 'seed', 'park'),
        ('seed-den-union', 'Denver Union Station', 39.7531, -105.0001, 'public', false, true, '1701 Wynkoop St, Denver', 'seed', 'toilet'),
        ('seed-lv-bellagio', 'Bellagio Conservatory', 36.1126, -115.1765, 'customers', false, true, '3600 S Las Vegas Blvd, Las Vegas', 'seed', 'business'),
        ('seed-chi-union', 'Chicago Union Station', 41.8786, -87.6403, 'public', false, true, '225 S Canal St, Chicago', 'seed', 'toilet'),
        ('seed-chi-navy', 'Navy Pier', 41.8917, -87.6086, 'public', false, true, '600 E Grand Ave, Chicago', 'seed', 'park'),
        ('seed-det-campus', 'Campus Martius Park', 42.3316, -83.0466, 'public', false, true, '800 Woodward Ave, Detroit', 'seed', 'park'),
        ('seed-nyc-penn', 'Moynihan Train Hall', 40.7506, -73.9935, 'public', false, true, '421 8th Ave, New York', 'seed', 'toilet'),
        ('seed-nyc-battery', 'Battery Park', 40.7033, -74.0170, 'public', false, true, 'Battery Park, New York', 'seed', 'park'),
        ('seed-bos-common', 'Boston Common', 42.3551, -71.0656, 'public', false, true, 'Boston Common, Boston', 'seed', 'park'),
        ('seed-phl-love', 'Love Park', 39.9543, -75.1657, 'public', false, true, 'Arch St, Philadelphia', 'seed', 'park'),
        ('seed-dc-union', 'Union Station', 38.8977, -77.0063, 'public', false, true, '50 Massachusetts Ave NE, Washington', 'seed', 'toilet'),
        ('seed-dc-mall', 'National Mall', 38.8893, -77.0502, 'public', false, true, 'National Mall, Washington', 'seed', 'park'),
        ('seed-atl-centennial', 'Centennial Olympic Park', 33.7603, -84.3935, 'public', false, true, '265 Park Ave W NW, Atlanta', 'seed', 'park'),
        ('seed-mia-bayfront', 'Bayfront Park', 25.7753, -80.1860, 'public', false, true, '301 Biscayne Blvd, Miami', 'seed', 'park'),
        ('seed-nsh-centennial', 'Centennial Park', 36.1490, -86.8125, 'public', false, true, '2500 West End Ave, Nashville', 'seed', 'park'),
        ('seed-nola-jackson', 'Jackson Square', 29.9574, -90.0629, 'public', false, true, 'Jackson Square, New Orleans', 'seed', 'park'),
        ('seed-sf-ferry', 'Ferry Building', 37.7955, -122.3937, 'public', false, true, '1 Ferry Building, San Francisco', 'seed', 'business'),
        ('seed-sf-union', 'Union Square', 37.7879, -122.4074, 'public', false, true, 'Union Square, San Francisco', 'seed', 'park'),
        ('seed-la-santa', 'Santa Monica Pier', 34.0084, -118.4970, 'public', false, true, 'Santa Monica Pier, Santa Monica', 'seed', 'park'),
        ('seed-nyc-times', 'Times Square Public Restroom', 40.7580, -73.9855, 'public', false, true, 'Times Square, New York', 'seed', 'toilet'),
        ('seed-dal-atm', 'Dallas City Hall', 32.7760, -96.7970, 'public', false, true, '1500 Marilla St, Dallas', 'seed', 'business'),
        ('seed-atx-domain', 'The Domain', 30.4010, -97.7250, 'customers', false, true, '11410 Century Oaks Terrace, Austin', 'seed', 'business')
      on conflict (id) do nothing`,
    );
    await sql.query(
      `update bathrooms set visibility = 'public'
       where source is distinct from 'user' and visibility is distinct from 'public'`,
    );
  })();
  await citySeedsPromise;
}

export const listBathrooms = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator(boundsSchema)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await ensureCitySeeds(sql);
    const { south, west, north, east } = data;
    const span = bboxSpanMeters(data);
    const cap = span > 90_000 ? 800 : span > 40_000 ? 1600 : 2800;
    const viewerId = context.userId;
    const dbRows = await sql.query<BathroomRow>(
      `select ${BATHROOM_SELECT}
       from bathrooms b
       ${STATS_JOIN}
       where b.lat between $1 and $2 and b.lng between $3 and $4
         and not exists (
           select 1 from removed_venues r
           where r.id = b.id or (b.osm_id is not null and r.osm_id = b.osm_id)
         )
         and (
           b.source is distinct from 'user'
           or coalesce(b.visibility, 'public') = 'public'
           or ($6::text is not null and b.created_by = $6)
         )
       order by
         case b.kind
           when 'grocery' then 0
           when 'gas' then 1
           when 'toilet' then 2
           when 'restaurant' then 3
           else 4
         end,
         coalesce(s.review_count, 0) desc
       limit $5`,
      [south, north, west, east, cap, viewerId],
    );
    return dbRows.map((row) => mapBathroom(row, viewerId));
  });

export const listOsmBathrooms = createServerFn({ method: "GET" })
  .validator(boundsSchema)
  .handler(async ({ data }) => {
    const span = bboxSpanMeters(data);
    if (span > OSM_MAX_SPAN_M) return [] as Bathroom[];
    try {
      const rooms = await fetchOsmBathrooms(data, span);
      try {
        const sql = await getSql();
        await rememberOsmPins(sql, rooms);
        const removed = await sql.query<{ id: string; osm_id: string | null }>(
          `select id, osm_id from removed_venues
           where lat between $1 and $2 and lng between $3 and $4`,
          [data.south - 0.02, data.north + 0.02, data.west - 0.02, data.east + 0.02],
        );
        return hideRemoved(rooms, {
          ids: removed.map((row) => row.id),
          osmIds: removed.map((row) => row.osm_id),
        });
      } catch {
        return rooms;
      }
    } catch (err) {
      console.warn("[flush-finder] overpass failed", err);
      return [] as Bathroom[];
    }
  });

export const getReviews = createServerFn({ method: "GET" })
  .validator(z.object({ bathroomId: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<ReviewRow>(
      `select ${REVIEW_SELECT}
       from reviews
       where bathroom_id = $1
       order by created_at desc
       limit 50`,
      [data.bathroomId],
    );
    return rows.map(mapReview);
  });

const bathroomInput = z.object({
  id: z.string().min(1).max(80).optional(),
  osmId: z.string().max(80).nullable().optional(),
  name: z.string().min(1).max(120),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accessType: accessSchema,
  fee: z.boolean().nullable().optional(),
  wheelchair: z.boolean().nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  source: z.enum(["osm", "user", "seed"]).optional(),
  kind: z.enum(["toilet", "restaurant", "gas", "grocery", "park", "business"]).optional(),
});

export const addBathroom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
      accessType: reviewAccessSchema,
      address: z.string().trim().max(160).optional(),
      kind: z.enum(["toilet", "restaurant", "gas", "grocery", "park", "business"]).optional(),
      personal: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireConfirmedReviewer } = await import("@/lib/reviewer.server");
    const reviewer = await requireConfirmedReviewer(context.userId);
    assertCivil(data.name);
    if (data.address) assertCivil(data.address);
    const sql = await getSql();
    const {
      ADD_HOLD_MS,
      idsToPromoteNationwide,
      shouldHoldAfterAdds,
      startingVisibility,
    } = await import("@/lib/pin-policy");

    const holdRows = await sql.query<{ held_until: string }>(
      `select held_until::text as held_until from add_holds where user_id = $1`,
      [reviewer.userId],
    );
    const heldUntil = holdRows[0]?.held_until ? Date.parse(holdRows[0].held_until) : 0;
    if (heldUntil > Date.now()) {
      throw new Error("HOLD:Adding more than 4 bathrooms in under 20 minutes will result in temporary suspension");
    }

    const recent = await sql.query<{ n: number | string }>(
      `select count(*)::int as n from pin_add_events
       where user_id = $1 and created_at > now() - interval '20 minutes'`,
      [reviewer.userId],
    );
    const recentCount = Math.round(Number(recent[0]?.n) || 0);
    if (shouldHoldAfterAdds(recentCount)) {
      const until = new Date(Date.now() + ADD_HOLD_MS).toISOString();
      await sql.query(
        `insert into add_holds (user_id, held_until) values ($1, $2::timestamptz)
         on conflict (user_id) do update set held_until = excluded.held_until, created_at = now()`,
        [reviewer.userId, until],
      );
      throw new Error("HOLD:Adding more than 4 bathrooms in under 20 minutes will result in temporary suspension");
    }

    const personal = Boolean(data.personal);
    const visibility = startingVisibility(personal);
    const id = `user-${crypto.randomUUID()}`;
    await sql.query(
      `insert into bathrooms (id, name, lat, lng, access_type, address, source, kind, created_by, visibility)
       values ($1, $2, $3, $4, $5, $6, 'user', $7, $8, $9)`,
      [
        id,
        data.name,
        data.lat,
        data.lng,
        data.accessType,
        data.address || null,
        data.kind ?? "toilet",
        reviewer.userId,
        visibility,
      ],
    );
    await sql.query(
      `insert into pin_add_events (id, user_id, bathroom_id) values ($1, $2, $3)`,
      [`add-event-${id}`, reviewer.userId, id],
    );

    let nationwide = false;
    let earned = 0;
    const { awardPoints } = await import("@/lib/points.server");
    const { ADD_BATHROOM_POINTS } = await import("@/lib/badges");
    const { pointsForAddedPin } = await import("@/lib/pin-policy");
    if (!personal && data.accessType === "public") {
      const nearby = await sql.query<{
        id: string;
        lat: number;
        lng: number;
        created_by: string | null;
        visibility: string;
        access_type: string;
        source: string;
      }>(
        `select id, lat, lng, created_by, visibility, access_type, source
         from bathrooms
         where source = 'user' and visibility <> 'personal' and access_type = 'public'
           and lat between $1 and $2 and lng between $3 and $4`,
        [data.lat - 0.002, data.lat + 0.002, data.lng - 0.002, data.lng + 0.002],
      );
      const promote = idsToPromoteNationwide(
        nearby.map((row) => ({
          id: row.id,
          lat: Number(row.lat),
          lng: Number(row.lng),
          createdBy: row.created_by,
          visibility: (row.visibility as "public" | "pending" | "personal") || "pending",
          accessType: row.access_type,
          source: row.source,
        })),
        { lat: data.lat, lng: data.lng },
      );
      if (promote.length > 0) {
        nationwide = true;
        const pending = nearby.filter(
          (row) => promote.includes(row.id) && row.visibility === "pending" && row.created_by,
        );
        await sql.query(
          `update bathrooms set visibility = 'public'
           where id = any($1::text[]) and visibility = 'pending'`,
          [promote],
        );
        for (const row of pending) {
          const paid = await awardPoints(
            sql,
            row.created_by as string,
            ADD_BATHROOM_POINTS,
            `add-verified:${row.id}`,
          );
          if (row.created_by === reviewer.userId) earned = paid;
        }
      }
    }
    earned = pointsForAddedPin(nationwide, personal, ADD_BATHROOM_POINTS) ? earned : 0;
    if (nationwide && earned === 0 && !personal) {
      earned = await awardPoints(sql, reviewer.userId, ADD_BATHROOM_POINTS, `add-verified:${id}`);
    }

    const rows = await sql.query<BathroomRow>(
      `select ${BATHROOM_SELECT} from bathrooms b ${STATS_JOIN} where b.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new Error("Could not save restroom");
    return { bathroom: mapBathroom(row, reviewer.userId), pointsEarned: earned, nationwide };
  });

export const getAddHold = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{ held_until: string }>(
      `select held_until::text as held_until from add_holds where user_id = $1`,
      [context.userId],
    );
    const heldUntil = rows[0]?.held_until ?? null;
    const active = heldUntil ? Date.parse(heldUntil) > Date.now() : false;
    return { heldUntil: active ? heldUntil : null };
  });

export const deleteMyPin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const { requireConfirmedReviewer } = await import("@/lib/reviewer.server");
    const reviewer = await requireConfirmedReviewer(context.userId);
    const sql = await getSql();
    const rows = await sql.query<{
      id: string;
      osm_id: string | null;
      name: string;
      lat: number;
      lng: number;
      created_by: string | null;
      source: string;
    }>(
      `select id, osm_id, name, lat, lng, created_by, source from bathrooms where id = $1`,
      [data.id],
    );
    const row = rows[0];
    if (!row) throw new Error("That pin is already gone.");
    if (row.created_by !== reviewer.userId || row.source !== "user") {
      throw new Error("You can only remove a pin you added.");
    }
    await sql.query(`delete from bathrooms where id = $1`, [row.id]);
    await sql.query(
      `insert into removed_venues (id, osm_id, name, lat, lng, reason, removed_by)
       values ($1, $2, $3, $4, $5, 'gone', $6)
       on conflict (id) do nothing`,
      [row.id, row.osm_id, row.name, Number(row.lat), Number(row.lng), reviewer.userId],
    );
    return { ok: true as const, id: row.id, osmId: row.osm_id };
  });

export const reportGone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().min(1).max(80),
      osmId: z.string().max(80).nullable().optional(),
      name: z.string().min(1).max(120),
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
      reason: z.enum(["gone", "closed", "no_restroom", "unavailable"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireConfirmedReviewer } = await import("@/lib/reviewer.server");
    const reviewer = await requireConfirmedReviewer(context.userId);
    const sql = await getSql();
    await sql.query(
      `insert into removed_venues (id, osm_id, name, lat, lng, reason, removed_by)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         reason = excluded.reason,
         osm_id = coalesce(excluded.osm_id, removed_venues.osm_id),
         name = excluded.name`,
      [data.id, data.osmId ?? null, data.name, data.lat, data.lng, data.reason, reviewer.userId],
    );
    return { ok: true as const, id: data.id, osmId: data.osmId ?? null };
  });

export const addReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      bathroom: bathroomInput,
      rating: scoreSchema,
      cleanliness: scoreSchema,
      availability: scoreSchema,
      accessibility: scoreSchema,
      atmosphere: scoreSchema,
      accessType: reviewAccessSchema,
      askForKey: z.boolean().optional(),
      critique: z.string().trim().max(600),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireConfirmedReviewer } = await import("@/lib/reviewer.server");
    const reviewer = await requireConfirmedReviewer(context.userId);
    assertCivil(data.critique);
    assertCivil(data.bathroom.name);
    if (data.bathroom.address) assertCivil(data.bathroom.address);
    const sql = await getSql();
    const bathroomId = await upsertBathroom(sql, data.bathroom);
    const { reviewPoints, getBadge } = await import("@/lib/badges");
    const { awardPoints, equippedTitle } = await import("@/lib/points.server");
    const titleId = await equippedTitle(sql, reviewer.userId);
    const title = getBadge(titleId)?.title ?? null;
    const id = `rev-${crypto.randomUUID()}`;
    await sql.query(
      `insert into reviews (id, bathroom_id, rating, cleanliness, availability, accessibility, atmosphere, access_type, ask_for_key, critique, user_id, reviewer_name, reviewer_title)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        bathroomId,
        data.rating,
        data.cleanliness,
        data.availability,
        data.accessibility,
        data.atmosphere,
        data.accessType,
        Boolean(data.askForKey),
        data.critique,
        reviewer.userId,
        reviewer.name || "Verified account",
        title,
      ],
    );
    const earned = await awardPoints(
      sql,
      reviewer.userId,
      reviewPoints(data),
      `review:${id}`,
    );
    const rooms = await sql.query<BathroomRow>(
      `select ${BATHROOM_SELECT} from bathrooms b ${STATS_JOIN} where b.id = $1`,
      [bathroomId],
    );
    const reviews = await sql.query<ReviewRow>(
      `select ${REVIEW_SELECT}
       from reviews where bathroom_id = $1
       order by created_at desc limit 50`,
      [bathroomId],
    );
    const bathroom = rooms[0] ? mapBathroom(rooms[0], reviewer.userId) : null;
    if (!bathroom) throw new Error("Could not load restroom after review");
    return { bathroom, reviews: reviews.map(mapReview), pointsEarned: earned };
  });

export const searchPlaces = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().trim().min(2).max(80) }))
  .handler(async ({ data }): Promise<PlaceHit[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "0");
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "FlushFinder/1.0 (restroom map)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("Place search failed");
    const json = (await res.json()) as Array<{
      display_name?: string;
      lat: string;
      lon: string;
    }>;
    return json
      .map((hit) => ({
        label: (hit.display_name ?? "Place").split(",").slice(0, 3).join(","),
        lat: Number(hit.lat),
        lng: Number(hit.lon),
      }))
      .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng));
  });

export const getWalkingRoute = createServerFn({ method: "GET" })
  .validator(
    z.object({
      fromLat: z.number(),
      fromLng: z.number(),
      toLat: z.number(),
      toLng: z.number(),
    }),
  )
  .handler(async ({ data }): Promise<WalkingRoute> => {
    const path = `${data.fromLng},${data.fromLat};${data.toLng},${data.toLat}`;
    const url = `https://router.project-osrm.org/route/v1/foot/${path}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("Could not plot a walking route");
    const json = (await res.json()) as {
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { coordinates: [number, number][] };
      }>;
    };
    const route = json.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
      throw new Error("No walking route found");
    }
    return {
      coordinates: route.geometry.coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  });

type SqlClient = Awaited<ReturnType<typeof getSql>>;

async function upsertBathroom(
  sql: SqlClient,
  input: z.infer<typeof bathroomInput>,
): Promise<string> {
  if (input.id) {
    const existing = await sql.query<{ id: string }>(
      `select id from bathrooms where id = $1`,
      [input.id],
    );
    if (existing[0]) return existing[0].id;
  }
  if (input.osmId) {
    const byOsm = await sql.query<{ id: string }>(
      `select id from bathrooms where osm_id = $1`,
      [input.osmId],
    );
    if (byOsm[0]) return byOsm[0].id;
  }

  const nearby = await sql.query<{ id: string; lat: number; lng: number }>(
    `select id, lat, lng from bathrooms
     where lat between $1 and $2 and lng between $3 and $4`,
    [input.lat - 0.0004, input.lat + 0.0004, input.lng - 0.0004, input.lng + 0.0004],
  );
  const dup = nearby.find(
    (row) =>
      haversineMeters(
        { lat: Number(row.lat), lng: Number(row.lng) },
        { lat: input.lat, lng: input.lng },
      ) < 28,
  );
  if (dup) return dup.id;

  const id = input.id ?? `user-${crypto.randomUUID()}`;
  await sql.query(
    `insert into bathrooms (id, osm_id, name, lat, lng, access_type, fee, wheelchair, address, source, kind)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (id) do nothing`,
    [
      id,
      input.osmId ?? null,
      input.name,
      input.lat,
      input.lng,
      input.accessType,
      input.fee ?? null,
      input.wheelchair ?? null,
      input.address ?? null,
      input.source ?? (input.osmId ? "osm" : "user"),
      input.kind ?? "toilet",
    ],
  );
  return id;
}

async function rememberOsmPins(sql: SqlClient, rooms: Bathroom[]) {
  const named = rooms.filter((room) => room.source === "osm" && room.name.trim().length > 1);
  const chunk = 80;
  for (let i = 0; i < named.length; i += chunk) {
    const slice = named.slice(i, i + chunk);
    const params: unknown[] = [];
    const tuples = slice.map((room, idx) => {
      const o = idx * 9;
      params.push(
        room.id,
        room.osmId,
        room.name,
        room.lat,
        room.lng,
        room.accessType,
        room.source,
        room.kind,
        "public",
      );
      return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9})`;
    });
    try {
      await sql.query(
        `insert into bathrooms (id, osm_id, name, lat, lng, access_type, source, kind, visibility)
         values ${tuples.join(",")}
         on conflict do nothing`,
        params,
      );
    } catch (err) {
      console.warn("[flush-finder] remember osm failed", err);
    }
  }
}

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function nwFilter(filter: string, bbox: string) {
  return `node${filter}(${bbox});way${filter}(${bbox});`;
}

function poiFuel(bbox: string) {
  return nwFilter('["amenity"="fuel"]["name"]', bbox) + nwFilter('["amenity"="fuel"]["brand"]', bbox);
}

function poiGrocery(bbox: string) {
  return nwFilter(
    '["shop"~"^(supermarket|convenience|grocery|department_store|wholesale|hypermarket)$"]["name"]',
    bbox,
  );
}

function poiMeals(bbox: string) {
  return nwFilter('["amenity"~"^(restaurant|cafe|fast_food|bar|pub|food_court)$"]["name"]', bbox);
}

function poiUnion(bbox: string) {
  return poiFuel(bbox) + poiMeals(bbox) + poiGrocery(bbox);
}

async function fetchOsmBathrooms(
  bounds: z.infer<typeof boundsSchema>,
  span: number,
): Promise<Bathroom[]> {
  const padded = padBounds(bounds, span <= 18_000 ? 0.18 : 0.1);
  const tiles = tileBounds(padded, span);
  const timeout = 20;
  const close = span <= 16_000;

  const queries: string[] = [];
  for (const tile of tiles) {
    const bbox = `${tile.south},${tile.west},${tile.north},${tile.east}`;
    queries.push(`[out:json][timeout:${timeout}];(${poiFuel(bbox)});out center 3000;`);
    queries.push(`[out:json][timeout:${timeout}];(${poiGrocery(bbox)});out center 3000;`);
  }
  const full = `${padded.south},${padded.west},${padded.north},${padded.east}`;
  queries.push(
    `[out:json][timeout:${timeout}];(${nwFilter('["amenity"="toilets"]', full)}${nwFilter('["toilets"="yes"]', full)}${nwFilter('["highway"="rest_area"]', full)}${nwFilter('["highway"="services"]', full)});out center 500;`,
  );
  if (close) {
    queries.push(`[out:json][timeout:${timeout}];(${poiMeals(full)});out center 1500;`);
    queries.push(
      `[out:json][timeout:${timeout}];(${nwFilter('["leisure"~"^(park|garden|marina|picnic_site|sports_centre|stadium|recreation_ground)$"]["name"]', full)}${nwFilter('["tourism"~"^(hotel|motel|museum|camp_site|attraction)$"]["name"]', full)}${nwFilter('["amenity"~"^(pharmacy|library|townhall|community_centre|hospital|clinic|place_of_worship|post_office|university)$"]["name"]', full)}${nwFilter('["shop"~"^(doityourself|hardware|mall|car|car_repair)$"]["name"]', full)});out center 500;`,
    );
  }

  const chunks = await Promise.all(queries.map((query) => overpassElements(query)));
  const seen = new Set<string>();
  const rooms: Bathroom[] = [];
  for (const el of chunks.flat()) {
    const key = `${el.type}:${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const tags = el.tags ?? {};
    const kind = osmKind(tags);
    if (!kind) continue;
    rooms.push({
      id: `osm:${el.type}:${el.id}`,
      osmId: `${el.type}/${el.id}`,
      name: osmName(tags, kind),
      lat,
      lng,
      accessType: kind === "toilet" || kind === "park" ? osmAccess(tags) : "customers",
      fee: osmBool(tags.fee),
      wheelchair: osmWheelchair(tags.wheelchair),
      address: osmAddress(tags),
      source: "osm",
      kind,
      visibility: "public",
      mine: false,
      avgRating: null,
      reviewCount: 0,
      avgCleanliness: null,
      avgAvailability: null,
      avgAccessibility: null,
      avgAtmosphere: null,
      askForKey: false,
      customersOnly: kind !== "toilet" && kind !== "park",
    });
  }

  const MAX_PINS = 900;
  if (rooms.length <= MAX_PINS) return rooms;
  const rank: Record<VenueKind, number> = {
    gas: 0,
    grocery: 1,
    restaurant: 2,
    toilet: 3,
    park: 4,
    business: 5,
  };
  return rooms.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, MAX_PINS);
}

function padBounds(
  bounds: { south: number; west: number; north: number; east: number },
  factor: number,
) {
  const dLat = (bounds.north - bounds.south) * factor;
  const dLng = (bounds.east - bounds.west) * factor;
  return {
    south: bounds.south - dLat,
    west: bounds.west - dLng,
    north: bounds.north + dLat,
    east: bounds.east + dLng,
  };
}

function tileBounds(
  bounds: { south: number; west: number; north: number; east: number },
  span: number,
) {
  const n = span <= 14_000 ? 1 : span <= 36_000 ? 2 : 3;
  if (n === 1) return [bounds];
  const tiles: typeof bounds[] = [];
  const latStep = (bounds.north - bounds.south) / n;
  const lngStep = (bounds.east - bounds.west) / n;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      tiles.push({
        south: bounds.south + r * latStep,
        north: bounds.south + (r + 1) * latStep,
        west: bounds.west + c * lngStep,
        east: bounds.west + (c + 1) * lngStep,
      });
    }
  }
  return tiles;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

async function overpassElements(query: string): Promise<OsmElement[]> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "FlushFinder/1.0 (restroom map)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(18000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: OsmElement[] };
      return json.elements ?? [];
    } catch {
      continue;
    }
  }
  return [];
}

function osmKind(tags: Record<string, string>): VenueKind | null {
  const amenity = (tags.amenity ?? "").toLowerCase();
  const shop = (tags.shop ?? "").toLowerCase();
  const leisure = (tags.leisure ?? "").toLowerCase();
  const tourism = (tags.tourism ?? "").toLowerCase();
  const highway = (tags.highway ?? "").toLowerCase();
  if (amenity === "toilets" || highway === "rest_area" || highway === "services") return "toilet";
  if (amenity === "fuel" || amenity === "charging_station") return "gas";
  if (
    amenity === "restaurant" ||
    amenity === "cafe" ||
    amenity === "fast_food" ||
    amenity === "bar" ||
    amenity === "pub" ||
    amenity === "ice_cream" ||
    amenity === "food_court" ||
    amenity === "biergarten" ||
    shop === "bakery"
  ) {
    return "restaurant";
  }
  if (
    shop === "supermarket" ||
    shop === "convenience" ||
    shop === "grocery" ||
    shop === "department_store" ||
    shop === "wholesale" ||
    shop === "variety" ||
    shop === "general" ||
    shop === "discount" ||
    shop === "greengrocer" ||
    shop === "butcher" ||
    shop === "deli" ||
    shop === "hypermarket"
  ) {
    return "grocery";
  }
  if (
    leisure === "park" ||
    leisure === "garden" ||
    leisure === "marina" ||
    leisure === "picnic_site" ||
    leisure === "sports_centre" ||
    leisure === "stadium" ||
    leisure === "recreation_ground" ||
    leisure === "golf_course"
  ) {
    return "park";
  }
  if (
    tourism === "hotel" ||
    tourism === "motel" ||
    tourism === "museum" ||
    tourism === "camp_site" ||
    tourism === "attraction" ||
    tourism === "theme_park" ||
    tourism === "zoo" ||
    tourism === "guest_house" ||
    amenity === "pharmacy" ||
    amenity === "bank" ||
    amenity === "library" ||
    amenity === "townhall" ||
    amenity === "community_centre" ||
    amenity === "cinema" ||
    amenity === "theatre" ||
    amenity === "hospital" ||
    amenity === "clinic" ||
    amenity === "doctors" ||
    amenity === "dentist" ||
    amenity === "place_of_worship" ||
    amenity === "post_office" ||
    amenity === "courthouse" ||
    amenity === "university" ||
    amenity === "college" ||
    amenity === "arts_centre" ||
    shop === "doityourself" ||
    shop === "hardware" ||
    shop === "mall" ||
    shop === "clothes" ||
    shop === "electronics" ||
    shop === "furniture" ||
    shop === "car" ||
    shop === "car_repair"
  ) {
    return "business";
  }
  if (tags.toilets === "yes") return "toilet";
  return null;
}

function osmName(tags: Record<string, string>, kind: VenueKind = "toilet"): string {
  const named = tags.name || tags["name:en"] || tags.brand || tags.operator;
  if (named) return named;
  if (kind === "restaurant") return "Restaurant restroom";
  if (kind === "gas") return "Gas station restroom";
  if (kind === "grocery") return "Grocery restroom";
  if (kind === "park") return "Park restroom";
  return "Public restroom";
}

function osmAccess(tags: Record<string, string>): AccessType {
  const access = (tags.access ?? "").toLowerCase();
  if (access === "customers" || access === "destination" || tags["toilets:access"] === "customers") {
    return "customers";
  }
  if (access === "public" || access === "yes" || access === "permissive") return "public";
  if (tags.fee === "yes" && access === "") return "public";
  return "public";
}

function osmBool(value: string | undefined): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function osmWheelchair(value: string | undefined): boolean | null {
  if (value === "yes" || value === "limited") return true;
  if (value === "no") return false;
  return null;
}

function osmAddress(tags: Record<string, string>): string | null {
  const num = tags["addr:housenumber"];
  const street = tags["addr:street"];
  const city = tags["addr:city"];
  const parts = [num && street ? `${num} ${street}` : street, city].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export { mergeBathrooms };
