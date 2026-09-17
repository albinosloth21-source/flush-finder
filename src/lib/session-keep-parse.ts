export type KeptUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  isDevFallback: boolean;
};

export function parseKeptUser(raw: string | null | undefined): KeptUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<KeptUser>;
    if (!parsed?.id || typeof parsed.id !== "string") return null;
    return {
      id: parsed.id,
      displayName: parsed.displayName ?? null,
      primaryEmail: parsed.primaryEmail ?? null,
      profileImageUrl: parsed.profileImageUrl ?? null,
      isDevFallback: Boolean(parsed.isDevFallback),
    };
  } catch {
    return null;
  }
}
