import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  isRateLimited,
  parseModeratorIds,
  REPORT_RATE_WINDOW_MINUTES,
  REPORT_REASONS,
  statusAfterReport,
  type ModerationStatus,
} from "@/lib/review-reports";

async function sqlClient() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

export const reportReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      reviewId: z.string().min(1).max(80),
      reason: z.enum(REPORT_REASONS),
      note: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireConfirmedReviewer } = await import("@/lib/reviewer.server");
    const reviewer = await requireConfirmedReviewer(context.userId);
    const sql = await sqlClient();

    const recent = await sql.query<{ n: number }>(
      `select count(*)::int as n from review_reports
       where reporter_id = $1 and created_at > now() - ($2 || ' minutes')::interval`,
      [reviewer.userId, String(REPORT_RATE_WINDOW_MINUTES)],
    );
    if (isRateLimited(recent[0]?.n ?? 0)) {
      throw new Error("You've sent a lot of reports. Try again in a little while.");
    }

    const review = await sql.query<{ user_id: string | null; moderation_status: ModerationStatus }>(
      `select user_id, moderation_status from reviews where id = $1`,
      [data.reviewId],
    );
    if (!review[0]) throw new Error("That review no longer exists.");
    if (review[0].user_id && review[0].user_id === reviewer.userId) {
      throw new Error("You can't report your own review.");
    }

    await sql.query(
      `insert into review_reports (review_id, reporter_id, reason, note)
       values ($1, $2, $3, $4)
       on conflict (review_id, reporter_id) do nothing`,
      [data.reviewId, reviewer.userId, data.reason, (data.note ?? "").trim()],
    );
    const count = await sql.query<{ n: number }>(
      `select count(distinct reporter_id)::int as n from review_reports where review_id = $1`,
      [data.reviewId],
    );
    const next = statusAfterReport(review[0].moderation_status, count[0]?.n ?? 0);
    if (next !== review[0].moderation_status) {
      await sql.query(`update reviews set moderation_status = $2 where id = $1`, [data.reviewId, next]);
    }
    return { ok: true as const, hidden: next === "pending" };
  });

function requireModerator(userId: string) {
  if (!parseModeratorIds(process.env.MODERATOR_USER_IDS).has(userId)) {
    throw new Error("Moderators only.");
  }
}

/** Reported reviews, pending first. Moderators are listed in MODERATOR_USER_IDS. */
export const listReportedReviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requireModerator(context.userId);
    const sql = await sqlClient();
    return sql.query<{
      id: string;
      bathroom_id: string;
      critique: string;
      moderation_status: ModerationStatus;
      reports: number;
      reasons: string;
    }>(
      `select r.id, r.bathroom_id, r.critique, r.moderation_status,
              count(rr.id)::int as reports, string_agg(distinct rr.reason, ', ') as reasons
       from reviews r join review_reports rr on rr.review_id = r.id
       group by r.id
       order by (r.moderation_status = 'pending') desc, count(rr.id) desc
       limit 100`,
    );
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ reviewId: z.string().min(1).max(80), decision: z.enum(["approved", "removed"]) }))
  .handler(async ({ data, context }) => {
    requireModerator(context.userId);
    const sql = await sqlClient();
    await sql.query(
      `update reviews set moderation_status = $2, moderated_at = now(), moderated_by = $3 where id = $1`,
      [data.reviewId, data.decision, context.userId],
    );
    return { ok: true as const };
  });
