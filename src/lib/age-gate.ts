import { MIN_AGE } from "./constants.ts";

export const AGE_CONFIRM_KEY = "ff-age-confirmed-v1";

export function ageConfirmLabel(minAge = MIN_AGE): string {
  return `I am ${minAge} or older`;
}

/** Creating an account (email sign-up or any provider button) needs the age confirmation. */
export function needsAgeConfirmation(action: "email-signin" | "email-signup" | "provider"): boolean {
  return action !== "email-signin";
}

export function parseAgeConfirmed(raw: string | null | undefined, minAge = MIN_AGE): boolean {
  return raw === String(minAge);
}
