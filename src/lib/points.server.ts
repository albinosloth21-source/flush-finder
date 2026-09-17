import type { Sql } from "@/lib/db";

export async function awardPoints(sql: Sql, userId: string, amount: number, reason: string) {
  if (amount <= 0) return 0;
  const seen = await sql.query<{ id: string }>(
    `select id from points_ledger where user_id = $1 and reason = $2 limit 1`,
    [userId, reason],
  );
  if (seen[0]) return 0;
  await sql.query(
    `insert into profiles (user_id, points) values ($1, $2)
     on conflict (user_id) do update set points = profiles.points + excluded.points`,
    [userId, amount],
  );
  await sql.query(
    `insert into points_ledger (id, user_id, amount, reason) values ($1, $2, $3, $4)`,
    [`pts-${crypto.randomUUID()}`, userId, amount, reason],
  );
  return amount;
}

export async function equippedTitle(sql: Sql, userId: string): Promise<string | null> {
  const rows = await sql.query<{ equipped_badge: string | null }>(
    `select equipped_badge from profiles where user_id = $1`,
    [userId],
  );
  return rows[0]?.equipped_badge ?? null;
}
