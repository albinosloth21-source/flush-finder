export const TOILET_MAX = 5;

export function clampToiletScore(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(TOILET_MAX, Math.max(0, n));
}

export function displayToiletScore(value: number | string | null | undefined): number | null {
  const score = clampToiletScore(value);
  if (score == null) return null;
  return Math.round(score * 10) / 10;
}

export function formatToiletScore(value: number | string | null | undefined): string {
  const score = displayToiletScore(value);
  if (score == null) return "Unrated";
  const label = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return `${label} of ${TOILET_MAX} toilets`;
}

export function toiletFill(value: number | string | null | undefined, index: number): 0 | 0.5 | 1 {
  const score = displayToiletScore(value) ?? 0;
  if (index < 1 || index > TOILET_MAX) return 0;
  if (score >= index) return 1;
  if (score >= index - 0.5) return 0.5;
  return 0;
}

export function litToiletCount(value: number | string | null | undefined): number {
  const score = displayToiletScore(value);
  if (score == null) return 0;
  return Math.min(TOILET_MAX, Math.floor(score + 1e-9));
}

export function lightsMatchCaption(value: number | string | null | undefined): boolean {
  const score = displayToiletScore(value);
  if (score == null) return toiletFill(value, 1) === 0;
  let full = 0;
  let half = 0;
  for (let i = 1; i <= TOILET_MAX; i += 1) {
    const fill = toiletFill(score, i);
    if (fill === 1) full += 1;
    if (fill === 0.5) half += 1;
  }
  const expectedFull = Math.floor(score);
  const expectedHalf = score - expectedFull >= 0.5 ? 1 : 0;
  return full === expectedFull && half === expectedHalf && full + half <= TOILET_MAX;
}

export function overallScore(
  avg: number | string | null | undefined,
  reviews?: Array<{ rating: number | string | null | undefined }>,
): number | null {
  const direct = displayToiletScore(avg);
  if (direct != null && direct > 0) return direct;
  if (!reviews?.length) return direct;
  let sum = 0;
  let count = 0;
  for (const review of reviews) {
    const n = Number(review.rating);
    if (!Number.isFinite(n)) continue;
    sum += n;
    count += 1;
  }
  return count ? displayToiletScore(sum / count) : null;
}
