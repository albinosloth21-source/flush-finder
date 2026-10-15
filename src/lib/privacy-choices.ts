export const PRIVACY_CHOICE_KEY = "ff-privacy-choices-v1";

export type PrivacyChoices = {
  allowSaleAndAds: boolean;
};

/** Off by default: data sale and personalized ads need an explicit opt-in. */
export const DEFAULT_PRIVACY_CHOICES: PrivacyChoices = {
  allowSaleAndAds: false,
};

/** Only an explicit "yes" turns sale and ads on; anything missing or unknown is off. */
export function parseAllowFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "t" || value === "true" || value === "y";
}

export function normalizePrivacyChoices(input: Partial<PrivacyChoices> | null | undefined): PrivacyChoices {
  return {
    allowSaleAndAds: parseAllowFlag(input?.allowSaleAndAds),
  };
}

export function isSaleAndAdsAllowed(choices: PrivacyChoices): boolean {
  return choices.allowSaleAndAds === true;
}

export function mergePrivacyChoices(local: PrivacyChoices, remote?: PrivacyChoices | null): PrivacyChoices {
  if (local.allowSaleAndAds === false || remote?.allowSaleAndAds === false) {
    return { allowSaleAndAds: false };
  }
  // Only this device's explicit opt-in turns it on; a server row may hold the old default.
  return { allowSaleAndAds: local.allowSaleAndAds === true };
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
