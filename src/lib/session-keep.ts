import { useEffect, useState } from "react";
import { useCurrentUserState, type AppUser, type CurrentUserState } from "@/lib/auth/use-current-user";
import { parseKeptUser } from "@/lib/session-keep-parse";

const KEY = "ff-keep-signed-in-v1";
export { parseKeptUser };

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
    /* storage blocked */
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

export function usePersistentUser(): CurrentUserState {
  const live = useCurrentUserState();
  const [kept, setKept] = useState<AppUser | null>(() => readKeptUser());
  const liveUser = live.user;
  useEffect(() => {
    if (!liveUser) return;
    keepSignedIn(liveUser);
    setKept(liveUser);
  }, [liveUser]);
  const user = liveUser ?? kept;
  return { user, isPending: live.isPending && !user };
}
