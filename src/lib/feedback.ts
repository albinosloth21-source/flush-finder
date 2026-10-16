/** In-app feedback rules + first-run intro storage. Pure so they are unit-testable. */

export const APP_VERSION = "1.0";

export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Bug",
  idea: "Idea",
  other: "Other",
};

export const FEEDBACK_MAX_CHARS = 2000;
/** Max feedback messages per user (or per IP for guests) per window. */
export const FEEDBACK_RATE_LIMIT = 5;
export const FEEDBACK_RATE_WINDOW_MINUTES = 60;

export function feedbackRateLimited(sentInWindow: number, limit = FEEDBACK_RATE_LIMIT): boolean {
  return sentInWindow >= limit;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FeedbackDraft = { kind: FeedbackKind; message: string; email?: string };

/** Returns an error message, or null when the draft can be sent. */
export function feedbackProblem(draft: FeedbackDraft): string | null {
  const message = draft.message.trim();
  if (!message) return "Tell us what's up first.";
  if (message.length > FEEDBACK_MAX_CHARS) return `Keep it under ${FEEDBACK_MAX_CHARS} characters.`;
  const email = (draft.email ?? "").trim();
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) return "That email doesn't look right.";
  return null;
}

/** Round to ~1 km so feedback never carries a precise position. */
export function approxCoord(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

// ---- First-run intro ("Golden Throne" tour) ----
export const INTRO_SEEN_KEY = "ff-intro-seen-v1";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function store(): KV | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function introSeen(storage: KV | null = store()): boolean {
  if (!storage) return true; // no storage (SSR / locked down): never block the app
  try {
    return storage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroSeen(storage: KV | null = store()): void {
  try {
    storage?.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clampSlide(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.trunc(index)));
}
