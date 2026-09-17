import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { ADD_BATHROOM_POINTS, BADGES, CRITIQUE_POINTS, RATING_POINTS, SECONDARY_POINTS } from "@/lib/badges";
import { buyBadgeState, canBuyBadge, canEquipBadge, equipBadgeState, normalizeWallet, STARTER_BADGE_ID } from "@/lib/wallet-logic";

export const getWallet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(`insert into profiles (user_id, points) values ($1, 0) on conflict (user_id) do nothing`, [
      context.userId,
    ]);
    const ownedRows = await sql.query<{ badge_id: string }>(
      `select badge_id from user_badges where user_id = $1`,
      [context.userId],
    );
    const profile = await sql.query<{ points: number | string; equipped_badge: string | null }>(
      `select points, equipped_badge from profiles where user_id = $1`,
      [context.userId],
    );
    const wallet = normalizeWallet({
      points: Math.round(Number(profile[0]?.points) || 0),
      equipped: profile[0]?.equipped_badge ?? null,
      owned: ownedRows.map((row) => row.badge_id),
    });
    if (!ownedRows.some((row) => row.badge_id === STARTER_BADGE_ID)) {
      await sql.query(
        `insert into user_badges (user_id, badge_id) values ($1, $2) on conflict do nothing`,
        [context.userId, STARTER_BADGE_ID],
      );
    }
    await sql.query(`update profiles set equipped_badge = $1 where user_id = $2 and (equipped_badge is null or equipped_badge <> $1)`, [
      wallet.equipped,
      context.userId,
    ]);
    return {
      points: wallet.points,
      equipped: wallet.equipped,
      owned: wallet.owned,
      rates: {
        addBathroom: ADD_BATHROOM_POINTS,
        rating: RATING_POINTS,
        critique: CRITIQUE_POINTS,
        secondary: SECONDARY_POINTS,
      },
    };
  });

export const buyBadge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ badgeId: z.string().min(1).max(80) }))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const ownedRows = await sql.query<{ badge_id: string }>(
      `select badge_id from user_badges where user_id = $1`,
      [context.userId],
    );
    const profile = await sql.query<{ points: number | string; equipped_badge: string | null }>(
      `select points, equipped_badge from profiles where user_id = $1`,
      [context.userId],
    );
    const current = normalizeWallet({
      points: Math.round(Number(profile[0]?.points) || 0),
      equipped: profile[0]?.equipped_badge ?? null,
      owned: ownedRows.map((row) => row.badge_id),
    });
    const allowed = canBuyBadge(current, data.badgeId);
    if (!allowed.ok) {
      throw new Error(
        allowed.reason === "missing"
          ? "That title is not in the shop."
          : allowed.reason === "owned"
            ? "You already have that title."
            : "Not enough points for that title.",
      );
    }
    const next = buyBadgeState(current, data.badgeId);
    const updated = await sql.query<{ points: number | string }>(
      `update profiles set points = points - $1, equipped_badge = $2
       where user_id = $3 and points >= $1
       returning points`,
      [allowed.badge.cost, next.equipped, context.userId],
    );
    if (!updated[0]) throw new Error("Not enough points for that title.");
    await sql.query(`insert into user_badges (user_id, badge_id) values ($1, $2) on conflict do nothing`, [
      context.userId,
      allowed.badge.id,
    ]);
    if (allowed.badge.cost > 0) {
      await sql.query(`insert into points_ledger (id, user_id, amount, reason) values ($1, $2, $3, $4)`, [
        `pts-${crypto.randomUUID()}`,
        context.userId,
        -allowed.badge.cost,
        `title:${allowed.badge.id}`,
      ]);
    }
    return { ok: true as const, equipped: allowed.badge.id, spent: allowed.badge.cost, points: next.points };
  });

export const equipBadge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ badgeId: z.string().min(1).max(80) }))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const ownedRows = await sql.query<{ badge_id: string }>(
      `select badge_id from user_badges where user_id = $1`,
      [context.userId],
    );
    const profile = await sql.query<{ equipped_badge: string | null; points: number | string }>(
      `select equipped_badge, points from profiles where user_id = $1`,
      [context.userId],
    );
    const current = normalizeWallet({
      points: Math.round(Number(profile[0]?.points) || 0),
      equipped: profile[0]?.equipped_badge ?? null,
      owned: ownedRows.map((row) => row.badge_id),
    });
    const allowed = canEquipBadge(current, data.badgeId);
    if (!allowed.ok) {
      throw new Error(allowed.reason === "missing" ? "That title is not in the shop." : "Buy that title first.");
    }
    const next = equipBadgeState(current, data.badgeId);
    await sql.query(`update profiles set equipped_badge = $1 where user_id = $2`, [next.equipped, context.userId]);
    return { ok: true as const, equipped: next.equipped };
  });

export { BADGES };
