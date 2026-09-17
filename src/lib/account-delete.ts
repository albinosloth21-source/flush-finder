import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

async function runQuiet(work: () => Promise<unknown>) {
  try {
    await work();
  } catch {
    /* table may be empty or already gone */
  }
}

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({}))
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const uid = context.userId;
    await runQuiet(() =>
      sql.query(
        `update reviews set reviewer_name = 'Deleted user', reviewer_title = null, user_id = null where user_id = $1`,
        [uid],
      ),
    );
    await runQuiet(() => sql.query(`delete from bathrooms where created_by = $1 and source = 'user'`, [uid]));
    await runQuiet(() => sql.query(`delete from user_badges where user_id = $1`, [uid]));
    await runQuiet(() => sql.query(`delete from points_ledger where user_id = $1`, [uid]));
    await runQuiet(() => sql.query(`delete from add_holds where user_id = $1`, [uid]));
    await runQuiet(() => sql.query(`delete from pin_add_events where user_id = $1`, [uid]));
    await runQuiet(() => sql.query(`delete from email_confirmations where user_id = $1`, [uid]));
    await runQuiet(() => sql.query(`delete from profiles where user_id = $1`, [uid]));
    await runQuiet(() => sql.query(`delete from "session" where "userId" = $1`, [uid]));
    await runQuiet(() => sql.query(`delete from "account" where "userId" = $1`, [uid]));
    await sql.query(`delete from "user" where "id" = $1`, [uid]);
    return { ok: true };
  });
