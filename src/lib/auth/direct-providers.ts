/**
 * Direct (first-party) Google and X sign-in — portable to any host.
 *
 * The Grok-hosted app signs in through Grok's auth broker (`grok-google` /
 * `grok-x`, see `providers.ts`), which only works on Grok's deployer. When the
 * server has its OWN OAuth credentials, Better Auth's built-in
 * `socialProviders.google` / `socialProviders.twitter` are registered instead
 * and the client tries them first:
 *
 *   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET   -> socialProviders.google
 *   TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET -> socialProviders.twitter (OAuth 2.0)
 *
 * Unset (the Grok preview / live app today) -> nothing changes: the broker path
 * is used exactly as before. Callback URLs: /api/auth/callback/google and
 * /api/auth/callback/twitter. Setup: docs/SIGN-IN-SETUP.md.
 */
type EnvLike = Record<string, string | undefined>;

const clean = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : undefined;
};

export type DirectSocialConfig = {
  google?: { clientId: string; clientSecret: string; prompt: "select_account" };
  twitter?: { clientId: string; clientSecret: string };
};

/** Server-side: direct provider configs present in env (empty object when none). */
export function directSocialConfigFromEnv(env: EnvLike): DirectSocialConfig {
  const out: DirectSocialConfig = {};
  const gId = clean(env.GOOGLE_CLIENT_ID);
  const gSecret = clean(env.GOOGLE_CLIENT_SECRET);
  if (gId && gSecret) out.google = { clientId: gId, clientSecret: gSecret, prompt: "select_account" };
  const xId = clean(env.TWITTER_CLIENT_ID);
  const xSecret = clean(env.TWITTER_CLIENT_SECRET);
  // Better Auth's twitter provider is OAuth 2.0 and requests users.email by default.
  if (xId && xSecret) out.twitter = { clientId: xId, clientSecret: xSecret };
  return out;
}

/** Broker provider id -> the Better Auth social id that can replace it directly. */
export const DIRECT_FOR_BROKER: Readonly<Record<string, "google" | "twitter">> = {
  "grok-google": "google",
  "grok-x": "twitter",
};

/**
 * Client-side decision: try the direct provider first? Never in the Grok live
 * preview (its popup flow is broker-only); otherwise yes whenever a direct
 * mapping exists. If the server has no direct creds it answers
 * PROVIDER_NOT_FOUND and the client falls back to the broker.
 */
export function directProviderFor(providerId: string, livePreview: boolean): "google" | "twitter" | null {
  if (livePreview) return null;
  return DIRECT_FOR_BROKER[providerId] ?? null;
}

/** True when a Better Auth error means "that social provider isn't configured". */
export function isProviderNotFound(error: { code?: string; status?: number; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PROVIDER_NOT_FOUND") return true;
  return error.status === 404 || /provider not found/i.test(error.message ?? "");
}
