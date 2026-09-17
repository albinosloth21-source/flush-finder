import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Reviewer } from "@/lib/types";

export const getReviewer = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Reviewer> => {
    const { loadReviewer } = await import("@/lib/reviewer.server");
    return loadReviewer(context.userId);
  });

export const requestEmailCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { loadReviewer } = await import("@/lib/reviewer.server");
    const reviewer = await loadReviewer(context.userId);
    if (reviewer.confirmed) return { confirmed: true as const, previewCode: null as string | null };
    if (!reviewer.email) {
      throw new Error("Add an email to this account before confirming.");
    }
    const { randomInt, createHash } = await import("node:crypto");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const hash = createHash("sha256").update(code).digest("hex");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(
      `insert into email_confirmations (user_id, code_hash, sent_to, expires_at)
       values ($1, $2, $3, now() + interval '30 minutes')
       on conflict (user_id) do update set
         code_hash = excluded.code_hash,
         sent_to = excluded.sent_to,
         expires_at = excluded.expires_at,
         created_at = now()`,
      [context.userId, hash, reviewer.email],
    );
    return { confirmed: false as const, previewCode: code };
  });

export const confirmEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ code: z.string().trim().regex(/^\d{6}$/) }))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ code_hash: string; expires_at: string }>(
      `select code_hash, expires_at::text as expires_at
       from email_confirmations
       where user_id = $1`,
      [context.userId],
    );
    const row = rows[0];
    if (!row) throw new Error("Request a confirmation code first.");
    if (Date.parse(row.expires_at) < Date.now()) throw new Error("That code expired. Request a new one.");
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const incoming = Buffer.from(createHash("sha256").update(data.code).digest("hex"), "hex");
    const stored = Buffer.from(row.code_hash, "hex");
    if (incoming.length !== stored.length || !timingSafeEqual(incoming, stored)) {
      throw new Error("That code does not match.");
    }
    await sql.query(`update profiles set email_confirmed_at = now() where user_id = $1`, [context.userId]);
    await sql.query(`delete from email_confirmations where user_id = $1`, [context.userId]);
    const { loadReviewer } = await import("@/lib/reviewer.server");
    return loadReviewer(context.userId);
  });
