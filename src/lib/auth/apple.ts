/**
 * Sign in with Apple (Better Auth `socialProviders.apple`).
 *
 * Off unless the server has APPLE_CLIENT_ID + APPLE_CLIENT_SECRET and the client
 * build has VITE_APPLE_SIGN_IN=1. Apple's identity is first-party here (not via
 * the Grok broker). Setup: docs/APPLE-SIGN-IN.md.
 */
export const APPLE_PROVIDER_ID = "apple";

export type AppleConfig = {
  clientId: string;
  clientSecret: string;
  appBundleIdentifier?: string;
};

type EnvLike = Record<string, string | undefined>;

const clean = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : undefined;
};

/** Server-side: Apple config from env, or null when not set up. */
export function appleConfigFromEnv(env: EnvLike): AppleConfig | null {
  const clientId = clean(env.APPLE_CLIENT_ID);
  const clientSecret = clean(env.APPLE_CLIENT_SECRET);
  if (!clientId || !clientSecret) return null;
  const appBundleIdentifier = clean(env.APPLE_APP_BUNDLE_IDENTIFIER);
  return { clientId, clientSecret, ...(appBundleIdentifier ? { appBundleIdentifier } : {}) };
}

/**
 * Client-side: show the Apple button on the web and on iOS; never on Android
 * (Apple only requires it on iOS, and the web flow is awkward there), and never
 * in the Grok preview iframe (Apple's redirect cannot complete in it).
 */
export function showAppleButton(opts: {
  enabledFlag: string | undefined;
  nativePlatform: "ios" | "android" | "web";
  livePreview: boolean;
}): boolean {
  if (String(opts.enabledFlag ?? "").trim() !== "1") return false;
  if (opts.livePreview) return false;
  return opts.nativePlatform !== "android";
}
