import { BADGES, TIER_LABEL, type BadgeDef, type BadgeTier } from "./badges.ts";
import { STARTER_BADGE_ID } from "./wallet-logic.ts";

export type AccountTab = "titles" | "privacy";
export type ShopFilter = "all" | "owned" | BadgeTier;

export const ACCOUNT_TABS: { id: AccountTab; label: string }[] = [
  { id: "titles", label: "Titles" },
  { id: "privacy", label: "Privacy" },
];

export function sortShop(badges: BadgeDef[]): BadgeDef[] {
  return badges.slice().sort((a, b) => {
    if (a.id === STARTER_BADGE_ID) return -1;
    if (b.id === STARTER_BADGE_ID) return 1;
    return a.cost - b.cost || a.title.localeCompare(b.title);
  });
}

export function filterTitleShop(filter: ShopFilter, owned: Iterable<string>): BadgeDef[] {
  const have = new Set(owned);
  have.add(STARTER_BADGE_ID);
  const rows = BADGES.filter((badge) => {
    if (filter === "all") return true;
    if (filter === "owned") return have.has(badge.id);
    return badge.tier === filter;
  });
  return sortShop(rows);
}

export function shopPriceLabel(badge: BadgeDef): string {
  if (badge.cost === 0) return "Free";
  return `${badge.cost} pts`;
}

export function shopAction(input: {
  badgeId: string;
  equippedId: string | null;
  owned: Iterable<string>;
  points: number;
}): "equipped" | "equip" | "buy" | "need-points" {
  if (input.badgeId === input.equippedId) return "equipped";
  const have = new Set(input.owned);
  have.add(STARTER_BADGE_ID);
  if (have.has(input.badgeId)) return "equip";
  const badge = BADGES.find((row) => row.id === input.badgeId);
  if (!badge) return "buy";
  if (input.points < badge.cost) return "need-points";
  return "buy";
}

export { TIER_LABEL, STARTER_BADGE_ID };
