import { useEffect, useState } from "react";
import { useCurrentUserState, type AppUser, type CurrentUserState } from "@/lib/auth/use-current-user";
import { parseKeptUser } from "@/lib/session-keep-parse";

const KEY = "ff-keep-signed-in-v1";

export { parseKeptUser };

function sameUser(a: AppUser | null, b: AppUser | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.displayName === b.displayName &&
    a.primaryEmail === b.primaryEmail &&
    a.profileImageUrl === b.profileImageUrl
  );
}

export function readKeptUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    return parseKeptUser(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function keepSignedIn(user: AppUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* storage full or blocked */
  }
}

export function clearKeptUser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Session user that survives reloads until they tap Sign out. */
export function usePersistentUser(): CurrentUserState {
  const live = useCurrentUserState();
  const [kept, setKept] = useState<AppUser | null>(() => readKeptUser());
  const liveUser = live.user;
  const liveId = liveUser?.id ?? "";

  useEffect(() => {
    if (!liveUser) return;
    keepSignedIn(liveUser);
    setKept((prev) => (sameUser(prev, liveUser) ? prev : liveUser));
  }, [liveId, liveUser?.displayName, liveUser?.primaryEmail, liveUser?.profileImageUrl]);

  const user = liveUser ?? kept;
  return {
    user,
    isPending: live.isPending && !user,
  };
}
