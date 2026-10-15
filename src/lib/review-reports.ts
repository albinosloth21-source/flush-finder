/** Review reporting rules. Pure so they are unit-testable. */

export const REPORT_REASONS = ["spam", "offensive", "false_info", "private_info", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam or ad",
  offensive: "Hateful or offensive",
  false_info: "False or misleading",
  private_info: "Shares private info",
  other: "Something else",
};

/** Distinct reporters needed before a review is hidden pending moderation. */
export const REPORT_HIDE_THRESHOLD = 3;
/** Max reports one account may file per window. */
export const REPORT_RATE_LIMIT = 10;
export const REPORT_RATE_WINDOW_MINUTES = 60;

export type ModerationStatus = "visible" | "pending" | "approved" | "removed";

/** Statuses shown publicly. */
export const PUBLIC_REVIEW_STATUSES: readonly ModerationStatus[] = ["visible", "approved"];

export function isRateLimited(reportsInWindow: number, limit = REPORT_RATE_LIMIT): boolean {
  return reportsInWindow >= limit;
}

/**
 * Status after a new report. Approved reviews stay up (a moderator already
 * looked); removed stays removed; visible flips to pending at the threshold.
 */
export function statusAfterReport(
  current: ModerationStatus,
  distinctReporters: number,
  threshold = REPORT_HIDE_THRESHOLD,
): ModerationStatus {
  if (current !== "visible") return current;
  return distinctReporters >= threshold ? "pending" : "visible";
}

/** Comma-separated moderator user ids from env (MODERATOR_USER_IDS). */
export function parseModeratorIds(raw: string | undefined | null): Set<string> {
  return new Set(
    String(raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
