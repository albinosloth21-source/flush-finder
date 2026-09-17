export const PRIVACY_CHOICE_KEY = "ff-privacy-choices-v1";

export type PrivacyChoices = { allowSaleAndAds: boolean };

export const DEFAULT_PRIVACY_CHOICES: PrivacyChoices = { allowSaleAndAds: true };

export function parseAllowFlag(value: unknown): boolean {
  if (value === false || value === 0 || value === "0" || value === "f" || value === "false" || value === "n") {
    return false;
  }
  return true;
}

export function normalizePrivacyChoices(input: Partial<PrivacyChoices> | null | undefined): PrivacyChoices {
  return { allowSaleAndAds: parseAllowFlag(input?.allowSaleAndAds) };
}

export function mergePrivacyChoices(local: PrivacyChoices, remote?: PrivacyChoices | null): PrivacyChoices {
  if (local.allowSaleAndAds === false || remote?.allowSaleAndAds === false) {
    return { allowSaleAndAds: false };
  }
  return { allowSaleAndAds: true };
}

export function readLocalPrivacyChoices(): PrivacyChoices {
  if (typeof window === "undefined") return DEFAULT_PRIVACY_CHOICES;
  try {
    const raw = window.localStorage.getItem(PRIVACY_CHOICE_KEY);
    if (!raw) return DEFAULT_PRIVACY_CHOICES;
    return normalizePrivacyChoices(JSON.parse(raw) as PrivacyChoices);
  } catch {
    return DEFAULT_PRIVACY_CHOICES;
  }
}

export function writeLocalPrivacyChoices(choices: PrivacyChoices) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRIVACY_CHOICE_KEY, JSON.stringify(normalizePrivacyChoices(choices)));
}
