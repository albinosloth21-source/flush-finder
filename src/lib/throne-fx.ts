/** Golden Throne touches: pure helpers (unit-tested) + tiny browser effects. */
import type { BadgeDef } from "./badges.ts";

/** A restroom earns the gold crown at a full five-toilet average. */
export function isGoldenThrone(avgRating: number | null | undefined, reviewCount = 1): boolean {
  return typeof avgRating === "number" && reviewCount > 0 && avgRating >= 4.95;
}

/** Progress toward the cheapest title not yet owned. null when every title is owned. */
export function nextTitleProgress(
  points: number,
  owned: Set<string>,
  badges: readonly Pick<BadgeDef, "id" | "title" | "cost">[],
): { title: string; cost: number; remaining: number; ratio: number } | null {
  const next = badges
    .filter((b) => !owned.has(b.id) && b.cost > 0)
    .sort((a, b) => a.cost - b.cost || a.title.localeCompare(b.title))[0];
  if (!next) return null;
  const safe = Math.max(0, points);
  return {
    title: next.title,
    cost: next.cost,
    remaining: Math.max(0, next.cost - safe),
    ratio: Math.min(1, safe / next.cost),
  };
}

// ---- Flush sound (OFF by default) ----
export const FLUSH_SOUND_KEY = "ff-flush-sound";

type KV = Pick<Storage, "getItem" | "setItem">;
function store(): KV | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function flushSoundOn(storage: KV | null = store()): boolean {
  try {
    return storage?.getItem(FLUSH_SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

export function setFlushSound(on: boolean, storage: KV | null = store()): void {
  try {
    storage?.setItem(FLUSH_SOUND_KEY, on ? "on" : "off");
  } catch {
    /* private mode */
  }
}

/** Soft synthesized "whoosh" (filtered noise, ~0.9s). Only after a user action, only if enabled. */
export function playFlush(force = false): void {
  if (typeof window === "undefined" || (!force && !flushSoundOn())) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const seconds = 0.9;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.onended = () => void ctx.close().catch(() => undefined);
  } catch {
    /* audio unavailable */
  }
}

/** Gentle gold bubbles rising from the top-center when points are earned. */
export function celebratePoints(points: number): void {
  if (typeof document === "undefined" || !(points > 0)) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const host = document.createElement("div");
  host.className = "ff-bubbles";
  host.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "ff-bubbles-label";
  label.textContent = `+${points} pts`;
  host.appendChild(label);
  if (!reduce) {
    for (let i = 0; i < 9; i++) {
      const b = document.createElement("span");
      b.className = "ff-bubble";
      const size = 6 + Math.round(Math.random() * 10);
      b.style.cssText = `left:${10 + Math.random() * 80}%;width:${size}px;height:${size}px;animation-delay:${(Math.random() * 0.35).toFixed(2)}s`;
      host.appendChild(b);
    }
  }
  document.body.appendChild(host);
  window.setTimeout(() => host.remove(), 1800);
}
