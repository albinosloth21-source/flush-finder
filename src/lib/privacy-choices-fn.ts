import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { DEFAULT_PRIVACY_CHOICES, normalizePrivacyChoices, parseAllowFlag, type PrivacyChoices } from "@/lib/privacy-choices";

export const getPrivacyChoices = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }): Promise<PrivacyChoices> => {
    if (!context.userId) return DEFAULT_PRIVACY_CHOICES;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(`insert into profiles (user_id, points) values ($1, 0) on conflict (user_id) do nothing`, [context.userId]);
    const rows = await sql.query<{ allow_sale_and_ads: boolean | null }>(`select allow_sale_and_ads from profiles where user_id = $1`, [context.userId]);
    return normalizePrivacyChoices({ allowSaleAndAds: parseAllowFlag(rows[0]?.allow_sale_and_ads) });
  });

export const setPrivacyChoices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ allowSaleAndAds: z.boolean() }))
  .handler(async ({ context, data }): Promise<PrivacyChoices> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const next = normalizePrivacyChoices(data);
    await sql.query(
      `insert into profiles (user_id, points, allow_sale_and_ads) values ($1, 0, $2)
       on conflict (user_id) do update set allow_sale_and_ads = excluded.allow_sale_and_ads`,
      [context.userId, next.allowSaleAndAds],
    );
    return next;
  });
