import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { AccountScreen } from "@/components/account-screen";
import { Button } from "@/components/ui/button";
import { overlayAfter, overlayMountsPanel, overlayShowsMap, type OverlayPhase } from "@/lib/account-shop";
import { clearKeptUser, usePersistentUser } from "@/lib/session-keep";

const subscribeToNothing = () => () => {};
const noGateOnServer = () => false;

export function HeaderAccount() {
  const { user, isPending } = usePersistentUser();
  const [signingOut, setSigningOut] = useState(false);
  const [phase, setPhase] = useState<OverlayPhase>("closed");
  const hideTimer = useRef<number>(0);
  const gateSession = useSyncExternalStore(subscribeToNothing, hasGateSessionMarker, noGateOnServer);

  function openAccount() {
    window.clearTimeout(hideTimer.current);
    setPhase(overlayAfter(phase, "open"));
  }

  function closeAccount() {
    setPhase(overlayAfter(phase, "close"));
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setPhase("closed"), 50);
  }

  if (isPending) {
    return <div className="size-11 shrink-0 animate-pulse rounded-md bg-foreground/8" />;
  }

  if (!user) {
    return (
      <Button variant="outline" asChild className="max-sm:size-11 max-sm:px-0">
        <Link to="/login" aria-label="Sign in">
          <UserRound className="size-4" />
          <span className="max-sm:hidden">Sign in</span>
        </Link>
      </Button>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const avatar = user.profileImageUrl ? (
    <img src={user.profileImageUrl} alt="" className="size-9 rounded-full object-cover" />
  ) : (
    <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
      {label.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={openAccount}
        className="flex min-w-0 items-center gap-2 rounded-full pr-1 hover:bg-foreground/5"
        aria-label="Open account and titles"
      >
        {avatar}
        <span className="hidden truncate text-xs font-medium sm:inline">{label}</span>
      </button>
      {authEnabled && !gateSession ? (
        <Button
          variant="ghost"
          size="sm"
          className="max-sm:hidden"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            clearKeptUser();
            void signOut().catch(() => setSigningOut(false));
          }}
        >
          {signingOut ? "…" : "Sign out"}
        </Button>
      ) : null}
      {overlayMountsPanel(phase) && typeof document !== "undefined"
        ? createPortal(
            <div hidden={overlayShowsMap(phase)} className={overlayShowsMap(phase) ? "hidden" : undefined}>
              <AccountScreen user={user} onClose={closeAccount} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
