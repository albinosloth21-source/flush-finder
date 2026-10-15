export type ListSheet = "hidden" | "mid" | "tall";

const SNAP_PX = 48;
const CLOSE_PX = 110;

/** Finger up is positive dy (startY - endY). */
export function snapListSheet(from: ListSheet, dy: number, threshold = SNAP_PX, closePx = CLOSE_PX): ListSheet {
  if (dy > threshold) {
    if (from === "hidden") return "mid";
    return "tall";
  }
  if (dy < -closePx) return "hidden";
  if (dy < -threshold) {
    if (from === "tall") return "mid";
    return "hidden";
  }
  return from;
}

export function listSheetOpen(sheet: ListSheet): boolean {
  return sheet !== "hidden";
}

/** A tap on a restroom pin always brings the pull-up menu back. */
export function listSheetAfterPinTap(): ListSheet {
  return "mid";
}

/** Tiny tap on the hidden-edge grabber (not a swipe) still reveals the list. */
export function tapRevealsHiddenList(from: ListSheet, dy: number, tapPx = 12): boolean {
  return from === "hidden" && Math.abs(dy) <= tapPx;
}

/** Swipe the review card down far enough and it tucks away until the next pin tap. */
export function snapReviewSheet(input: {
  tall: boolean;
  dy: number;
  threshold?: number;
  closePx?: number;
}): "tall" | "mid" | "closed" {
  const threshold = input.threshold ?? SNAP_PX;
  const closePx = input.closePx ?? CLOSE_PX;
  if (input.dy > threshold) return "tall";
  if (input.dy < -closePx) return "closed";
  if (input.dy < -threshold) return input.tall ? "mid" : "closed";
  return input.tall ? "tall" : "mid";
}

/** Crowded downtown maps need a tighter tap target so zoom/pan is not stolen. */
export function densePinHitPx(pinCount: number): number {
  if (pinCount >= 80) return 16;
  if (pinCount >= 30) return 22;
  return 28;
}

export function tapIsPan(movedPx: number, limit = 16): boolean {
  return movedPx > limit;
}

export function pinIconSize(pinCount: number): { w: number; h: number } {
  if (pinCount >= 80) return { w: 26, h: 32 };
  if (pinCount >= 30) return { w: 34, h: 42 };
  return { w: 42, h: 52 };
}

/** Overlapping downtown pins zoom in instead of opening a random restroom. */
export function crowdedTapAction(
  nearbyCount: number,
  zoom: number,
  isolateZoom = 18,
): "select" | "zoom" | "none" {
  if (nearbyCount <= 0) return "none";
  if (nearbyCount >= 2 && zoom < isolateZoom) return "zoom";
  return "select";
}

export function clusterZoom(current: number, maxZoom = 19): number {
  return Math.min(maxZoom, current + 2);
}
