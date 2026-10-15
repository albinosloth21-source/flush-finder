import { BADGE_BY_ID, getBadge, type BadgeDef, type BadgeTier } from "./badges.ts";

export const STARTER_BADGE_ID = "flush-newbie";

export type WalletState = {
  points: number;
  equipped: string | null;
  owned: string[];
};

export type ShopError = "missing" | "owned" | "broke" | "locked";

export function normalizeWallet(state: WalletState): WalletState {
  const owned = [...new Set(state.owned.filter((id) => BADGE_BY_ID.has(id)))];
  let points = Math.max(0, Math.round(Number(state.points) || 0));
  if (!Number.isFinite(points)) points = 0;
  if (owned.length === 0) {
    return { points, owned: [STARTER_BADGE_ID], equipped: STARTER_BADGE_ID };
  }
  const equipped =
    state.equipped && owned.includes(state.equipped)
      ? state.equipped
      : owned.includes(STARTER_BADGE_ID)
        ? STARTER_BADGE_ID
        : owned[0];
  return { points, owned, equipped };
}

export function canBuyBadge(state: WalletState, badgeId: string): { ok: true; badge: BadgeDef } | { ok: false; reason: ShopError } {
  const badge = getBadge(badgeId);
  if (!badge) return { ok: false, reason: "missing" };
  const wallet = normalizeWallet(state);
  if (wallet.owned.includes(badge.id)) return { ok: false, reason: "owned" };
  if (wallet.points < badge.cost) return { ok: false, reason: "broke" };
  return { ok: true, badge };
}

export function buyBadgeState(state: WalletState, badgeId: string): WalletState {
  const result = canBuyBadge(state, badgeId);
  if (!result.ok) {
    const message =
      result.reason === "missing"
        ? "That title is not in the shop."
        : result.reason === "owned"
          ? "You already have that title."
          : "Not enough points for that title.";
    throw new Error(message);
  }
  const wallet = normalizeWallet(state);
  return {
    points: wallet.points - result.badge.cost,
    owned: [...wallet.owned, result.badge.id],
    equipped: result.badge.id,
  };
}

export function canEquipBadge(state: WalletState, badgeId: string): { ok: true; badge: BadgeDef } | { ok: false; reason: ShopError } {
  const badge = getBadge(badgeId);
  if (!badge) return { ok: false, reason: "missing" };
  const wallet = normalizeWallet(state);
  if (!wallet.owned.includes(badge.id)) return { ok: false, reason: "locked" };
  return { ok: true, badge };
}

export function equipBadgeState(state: WalletState, badgeId: string): WalletState {
  const result = canEquipBadge(state, badgeId);
  if (!result.ok) {
    throw new Error(result.reason === "missing" ? "That title is not in the shop." : "Buy that title first.");
  }
  const wallet = normalizeWallet(state);
  return { ...wallet, equipped: result.badge.id };
}

export function awardPointsState(state: WalletState, amount: number): WalletState {
  const wallet = normalizeWallet(state);
  if (!Number.isFinite(amount) || amount <= 0) return wallet;
  return { ...wallet, points: wallet.points + Math.round(amount) };
}

export function spendPointsState(state: WalletState, amount: number): WalletState {
  const wallet = normalizeWallet(state);
  if (!Number.isFinite(amount) || amount <= 0) return wallet;
  const next = wallet.points - Math.round(amount);
  if (next < 0) throw new Error("Not enough points for that title.");
  return { ...wallet, points: next };
}

export function filterBadges(owned: Set<string>, filter: "all" | "owned" | BadgeTier, catalog: BadgeDef[]): BadgeDef[] {
  return catalog.filter((badge) => {
    if (filter === "all") return true;
    if (filter === "owned") return owned.has(badge.id);
    return badge.tier === filter;
  });
}
