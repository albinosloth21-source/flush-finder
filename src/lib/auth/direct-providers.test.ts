import { test } from "node:test";
import assert from "node:assert/strict";
import { directProviderFor, directSocialConfigFromEnv, isProviderNotFound } from "./direct-providers.ts";

test("no env -> no direct providers (Grok broker path unchanged)", () => {
  assert.deepEqual(directSocialConfigFromEnv({}), {});
  assert.deepEqual(directSocialConfigFromEnv({ GOOGLE_CLIENT_ID: "x", GOOGLE_CLIENT_SECRET: "  " }), {});
});

test("each provider enabled only by its own pair", () => {
  const g = directSocialConfigFromEnv({ GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gs" });
  assert.equal(g.google?.clientId, "gid");
  assert.equal(g.twitter, undefined);
  const x = directSocialConfigFromEnv({ TWITTER_CLIENT_ID: "xid", TWITTER_CLIENT_SECRET: "xs" });
  assert.deepEqual(x, { twitter: { clientId: "xid", clientSecret: "xs" } });
});

test("client tries direct first except in the live preview", () => {
  assert.equal(directProviderFor("grok-google", false), "google");
  assert.equal(directProviderFor("grok-x", false), "twitter");
  assert.equal(directProviderFor("grok-google", true), null);
  assert.equal(directProviderFor("apple", false), null);
});

test("PROVIDER_NOT_FOUND triggers broker fallback; other errors do not", () => {
  assert.equal(isProviderNotFound({ code: "PROVIDER_NOT_FOUND" }), true);
  assert.equal(isProviderNotFound({ status: 404 }), true);
  assert.equal(isProviderNotFound({ status: 400, message: "bad" }), false);
  assert.equal(isProviderNotFound(null), false);
});
