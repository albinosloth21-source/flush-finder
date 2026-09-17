import { BADGE_BY_ID, getBadge, type BadgeDef, type BadgeTier } from "./badges.ts";

export const STARTER_BADGE_ID = "flush-newbie";

export type WalletState = { points: number; equipped: string | null; owned: string[] };
export type ShopError = "missing" | "owned" | "broke" | "locked";

export function normalizeWallet(state: WalletState): WalletState {
  const owned = [...new Set(state.owned.filter((id) => BADGE_BY_ID.has(id)))];
  let points = Math.max(0, Math.round(Number(state.points) || 0));
  if (!Number.isFinite(points)) points = 0;
  if (owned.length === 0) return { points, owned: [STARTER_BADGE_ID], equipped: STARTER_BADGE_ID };
  const equipped =
    state.equipped && owned.includes(state.equipped)
      ? state.equipped
      : owned.includes(STARTER_BADGE_ID)
        ? STARTER_BADGE_ID
        : owned[0];
  return { points, owned, equipped };
}

export function canBuyBadge(state: WalletState, badgeId: string) {
  const badge = getBadge(badgeId);
  if (!badge) return { ok: false as const, reason: "missing" as const };
  const wallet = normalizeWallet(state);
  if (wallet.owned.includes(badge.id)) return { ok: false as const, reason: "owned" as const };
  if (wallet.points < badge.cost) return { ok: false as const, reason: "broke" as const };
  return { ok: true as const, badge };
}

export function buyBadgeState(state: WalletState, badgeId: string): WalletState {
  const result = canBuyBadge(state, badgeId);
  if (!result.ok) throw new Error("Cannot buy that title.");
  const wallet = normalizeWallet(state);
  return { points: wallet.points - result.badge.cost, owned: [...wallet.owned, result.badge.id], equipped: result.badge.id };
}

export function canEquipBadge(state: WalletState, badgeId: string) {
  const badge = getBadge(badgeId);
  if (!badge) return { ok: false as const, reason: "missing" as const };
  const wallet = normalizeWallet(state);
  if (!wallet.owned.includes(badge.id)) return { ok: false as const, reason: "locked" as const };
  return { ok: true as const, badge };
}

export function equipBadgeState(state: WalletState, badgeId: string): WalletState {
  const result = canEquipBadge(state, badgeId);
  if (!result.ok) throw new Error("Buy that title first.");
  return { ...normalizeWallet(state), equipped: result.badge.id };
}
