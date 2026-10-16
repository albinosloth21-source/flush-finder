import { test } from "node:test";
import assert from "node:assert/strict";
import {
  approxCoord,
  clampSlide,
  feedbackProblem,
  feedbackRateLimited,
  introSeen,
  markIntroSeen,
  FEEDBACK_MAX_CHARS,
} from "./feedback.ts";
import { flushSoundOn, isGoldenThrone, nextTitleProgress, setFlushSound } from "./throne-fx.ts";

function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

test("feedback validation", () => {
  assert.equal(feedbackProblem({ kind: "bug", message: "   " }), "Tell us what's up first.");
  assert.ok(feedbackProblem({ kind: "idea", message: "x".repeat(FEEDBACK_MAX_CHARS + 1) }));
  assert.equal(feedbackProblem({ kind: "other", message: "hi", email: "nope" }), "That email doesn't look right.");
  assert.equal(feedbackProblem({ kind: "bug", message: "map froze", email: "a@b.co" }), null);
  assert.equal(feedbackProblem({ kind: "bug", message: "map froze", email: "" }), null);
});

test("feedback rate limit is 5 per window", () => {
  assert.equal(feedbackRateLimited(4), false);
  assert.equal(feedbackRateLimited(5), true);
});

test("map center is rounded to ~1 km and never invented", () => {
  assert.equal(approxCoord(32.776664), 32.78);
  assert.equal(approxCoord(-96.796988), -96.8);
  assert.equal(approxCoord(null), null);
  assert.equal(approxCoord(Number.NaN), null);
});

test("intro shows once, and never blocks without storage", () => {
  const s = memory();
  assert.equal(introSeen(s), false);
  markIntroSeen(s);
  assert.equal(introSeen(s), true);
  assert.equal(introSeen(null), true);
  assert.equal(clampSlide(5, 3), 2);
  assert.equal(clampSlide(-1, 3), 0);
});

test("flush sound is off by default", () => {
  const s = memory();
  assert.equal(flushSoundOn(s), false);
  setFlushSound(true, s);
  assert.equal(flushSoundOn(s), true);
  setFlushSound(false, s);
  assert.equal(flushSoundOn(s), false);
});

test("golden throne crown only at five toilets with reviews", () => {
  assert.equal(isGoldenThrone(5, 3), true);
  assert.equal(isGoldenThrone(4.9, 3), false);
  assert.equal(isGoldenThrone(5, 0), false);
  assert.equal(isGoldenThrone(null, 2), false);
});

test("toilet-paper progress toward the cheapest unowned title", () => {
  const badges = [
    { id: "free", title: "Free", cost: 0 },
    { id: "a", title: "A", cost: 50 },
    { id: "b", title: "B", cost: 100 },
  ];
  assert.deepEqual(nextTitleProgress(20, new Set(["free"]), badges), { title: "A", cost: 50, remaining: 30, ratio: 0.4 });
  assert.equal(nextTitleProgress(500, new Set(["free", "b"]), badges)?.ratio, 1);
  assert.equal(nextTitleProgress(0, new Set(["a", "b"]), badges), null);
});
