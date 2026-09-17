import { getSql } from "@/lib/db";
import type { Reviewer } from "@/lib/types";

type UserRow = {
  email: string | null;
  emailVerified: boolean | string | number | null;
  name: string | null;
};

type AccountRow = { providerId: string };

function isTruthy(value: boolean | string | number | null | undefined): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export async function loadReviewer(userId: string): Promise<Reviewer> {
  const sql = await getSql();
  const users = await sql.query<UserRow>(
    `select email, "emailVerified" as "emailVerified", name from "user" where id = $1`,
    [userId],
  );
  const user = users[0];
  const accounts = await sql.query<AccountRow>(
    `select "providerId" as "providerId" from account where "userId" = $1`,
    [userId],
  );
  const oauth = accounts.some((row) => row.providerId && row.providerId !== "credential");
  const emailVerified = isTruthy(user?.emailVerified);
  await sql.query(
    `insert into profiles (user_id, email) values ($1, $2)
     on conflict (user_id) do update set email = excluded.email`,
    [userId, user?.email ?? null],
  );
  if (oauth || emailVerified) {
    await sql.query(
      `update profiles set email_confirmed_at = coalesce(email_confirmed_at, now()) where user_id = $1`,
      [userId],
    );
  }
  const profiles = await sql.query<{ email_confirmed_at: string | null }>(
    `select email_confirmed_at::text as email_confirmed_at from profiles where user_id = $1`,
    [userId],
  );
  return {
    userId,
    email: user?.email ?? null,
    name: user?.name ?? null,
    confirmed: Boolean(profiles[0]?.email_confirmed_at) || oauth || emailVerified,
  };
}

export async function requireConfirmedReviewer(userId: string): Promise<Reviewer> {
  const reviewer = await loadReviewer(userId);
  if (!reviewer.confirmed) {
    throw new Error("Confirm your email before leaving a review.");
  }
  return reviewer;
}
