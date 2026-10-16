import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX_CHARS,
  FEEDBACK_RATE_WINDOW_MINUTES,
  approxCoord,
  feedbackRateLimited,
} from "@/lib/feedback";
import { parseModeratorIds } from "@/lib/review-reports";

async function sqlClient() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function callerIpHash(): Promise<string | null> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { createHash } = await import("node:crypto");
  const headers = getRequest()?.headers;
  const ip =
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers?.get("x-real-ip") ??
    "";
  if (!ip) return null;
  const salt = process.env.FEEDBACK_IP_SALT ?? process.env.BETTER_AUTH_SECRET ?? "flush-finder";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator(
    z.object({
      kind: z.enum(FEEDBACK_KINDS),
      message: z.string().trim().min(1).max(FEEDBACK_MAX_CHARS),
      email: z.string().trim().max(254).email().optional().or(z.literal("")),
      appVersion: z.string().max(40).default(""),
      route: z.string().max(300).default(""),
      userAgent: z.string().max(500).default(""),
      mapLat: z.number().min(-90).max(90).nullable().optional(),
      mapLng: z.number().min(-180).max(180).nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId ?? null;
    const ipHash = await callerIpHash();
    const sql = await sqlClient();
    const recent = await sql.query<{ n: number }>(
      `select count(*)::int as n from app_feedback
       where created_at > now() - ($3 || ' minutes')::interval
         and (($1::text is not null and user_id = $1) or ($2::text is not null and ip_hash = $2))`,
      [userId, ipHash, String(FEEDBACK_RATE_WINDOW_MINUTES)],
    );
    if (feedbackRateLimited(recent[0]?.n ?? 0)) {
      throw new Error("Whoa, that's a lot of feedback. Try again in a little while.");
    }
    await sql.query(
      `insert into app_feedback (kind, message, email, user_id, ip_hash, app_version, route, user_agent, map_lat, map_lng)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.kind,
        data.message,
        data.email ? data.email : null,
        userId,
        ipHash,
        data.appVersion,
        data.route,
        data.userAgent,
        approxCoord(data.mapLat),
        approxCoord(data.mapLng),
      ],
    );
    return { ok: true as const };
  });

/** Latest feedback, newest first. Moderators are listed in MODERATOR_USER_IDS. */
export const listFeedback = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!parseModeratorIds(process.env.MODERATOR_USER_IDS).has(context.userId)) {
      throw new Error("Moderators only.");
    }
    const sql = await sqlClient();
    return sql.query<{
      id: number;
      kind: string;
      message: string;
      email: string | null;
      user_id: string | null;
      app_version: string;
      route: string;
      user_agent: string;
      map_lat: number | null;
      map_lng: number | null;
      status: string;
      created_at: string;
    }>(
      `select id, kind, message, email, user_id, app_version, route, user_agent,
              map_lat, map_lng, status, created_at::text as created_at
       from app_feedback order by created_at desc limit 200`,
    );
  });
