import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Medal } from "lucide-react";
import { toast } from "sonner";
import { authEnabled, endSessionNow, signOut } from "@/lib/auth/client";
import type { AppUser } from "@/lib/auth/use-current-user";
import { BadgeChip } from "@/components/badge-chip";
import { Button } from "@/components/ui/button";
import { PrivacyChoicesControl } from "@/components/privacy-choices";
import { PrivacyPolicyText } from "@/components/privacy-policy";
import { BADGES, getBadge } from "@/lib/badges";
import { deleteMyAccount } from "@/lib/account-delete";
import {
  ACCOUNT_TABS,
  STARTER_BADGE_ID,
  TIER_LABEL,
  filterTitleShop,
  shopAction,
  shopPriceLabel,
  type AccountTab,
  type ShopFilter,
} from "@/lib/account-shop";
import { clearKeptUser, usePersistentUser } from "@/lib/session-keep";
import { buyBadge, equipBadge, getWallet } from "@/lib/wallet";
import { cn } from "@/lib/utils";

const STARTER = getBadge(STARTER_BADGE_ID);
const FILTERS: ShopFilter[] = ["all", "owned", "starter", "common", "uncommon", "rare", "epic", "legend"];

export function AccountScreen({
  user,
  onClose,
}: {
  user?: AppUser | null;
  onClose?: () => void;
}) {
  const persisted = usePersistentUser();
  const resolved = user ?? persisted.user;
  return (
    <AccountShell onClose={onClose}>
      {resolved ? <AccountBody user={resolved} /> : <GuestAccount />}
    </AccountShell>
  );
}

function AccountShell({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[900] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Account"
    >
      <header className="z-10 flex shrink-0 items-center gap-2 border-b border-foreground/10 bg-background px-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 min-w-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-foreground"
          aria-label="Back to map"
        >
          <ChevronLeft className="size-5" />
          Map
        </button>
        <p className="font-display text-lg font-semibold">Account</p>
      </header>
      {children}
    </div>
  );
}

function GuestAccount() {
  return (
    <div className="px-4 py-8">
      <p className="text-sm text-muted">Sign in to see titles, points, and privacy choices.</p>
      <Button asChild className="mt-4">
        <Link to="/login">Sign in</Link>
      </Button>
    </div>
  );
}

function AccountBody({ user }: { user: AppUser }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AccountTab>("titles");
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [signingOut, setSigningOut] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "working">("idle");

  const walletQuery = useQuery({
    queryKey: ["wallet", user.id],
    queryFn: () => getWallet(),
    enabled: Boolean(user.id),
    staleTime: 15_000,
    retry: 2,
  });

  const buyMutation = useMutation({
    mutationFn: (badgeId: string) => buyBadge({ data: { badgeId } }),
    onSuccess: (result, badgeId) => {
      queryClient.setQueryData(["wallet", user.id], (old: { points: number; equipped: string | null; owned: string[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          points: result.points,
          equipped: result.equipped,
          owned: [...new Set([...old.owned, badgeId])],
        };
      });
      toast.success(`Unlocked ${getBadge(badgeId)?.title ?? "title"}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not buy that title"),
  });

  const equipMutation = useMutation({
    mutationFn: (badgeId: string) => equipBadge({ data: { badgeId } }),
    onSuccess: (result, badgeId) => {
      queryClient.setQueryData(["wallet", user.id], (old: { points: number; equipped: string | null; owned: string[] } | undefined) => {
        if (!old) return old;
        return { ...old, equipped: result.equipped };
      });
      toast.success(`Equipped ${getBadge(badgeId)?.title ?? "title"}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not equip that title"),
  });

  const owned = useMemo(() => {
    const ids = new Set(walletQuery.data?.owned ?? []);
    ids.add(STARTER_BADGE_ID);
    return ids;
  }, [walletQuery.data]);
  const points = walletQuery.data?.points ?? 0;
  const equipped = getBadge(walletQuery.data?.equipped ?? STARTER_BADGE_ID) ?? STARTER;
  const rows = useMemo(() => filterTitleShop(filter, owned), [filter, owned]);
  const name = user.displayName ?? user.primaryEmail ?? "Account";
  const walletBusy = walletQuery.isPending && !walletQuery.data;

  return (
    <>
      <nav className="flex shrink-0 gap-1 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-2">
        {ACCOUNT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-10 flex-1 rounded-full text-sm font-medium",
              tab === item.id ? "bg-primary text-primary-foreground" : "bg-foreground/6 text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-[max(1rem,env(safe-area-inset-left))] pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div hidden={tab !== "privacy"} className={tab === "privacy" ? undefined : "hidden"}>
          <section className="ff-sheet rounded-[var(--radius-xl)] bg-surface p-4">
            <PrivacyChoicesControl signedIn />
            <PrivacyPolicyText />
          </section>
        </div>

        <div hidden={tab !== "titles"} className={tab === "titles" ? undefined : "hidden"}>
            <section className="ff-sheet rounded-[var(--radius-xl)] bg-surface p-4">
              <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Signed in</p>
              <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">{name}</h1>
              <div className="mt-4 rounded-[var(--radius-lg)] bg-foreground/4 p-3">
                <p className="text-[0.6875rem] tracking-[0.14em] text-subtle uppercase">Your title</p>
                {equipped ? (
                  <div className="mt-2">
                    <BadgeChip badge={equipped} size="lg" />
                  </div>
                ) : null}
                <p className="mt-2 text-[0.75rem] text-muted">
                  Free starter: Flush Newbie. Buy another title with points, then Equip it.
                </p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] tracking-[0.14em] text-subtle uppercase">Points to spend</p>
                  <p className="font-display text-4xl font-semibold tabular-nums">{walletBusy ? "—" : points}</p>
                </div>
                <Medal className="size-8 text-primary" />
              </div>
              {authEnabled ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    disabled={signingOut || deleteStep === "working"}
                    onClick={() => {
                      setSigningOut(true);
                      clearKeptUser();
                      void signOut()
                        .then(() => {
                          window.location.href = "/";
                        })
                        .catch(() => setSigningOut(false));
                    }}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </Button>
                  {deleteStep !== "idle" ? (
                    <div className="rounded-[var(--radius-lg)] bg-foreground/4 p-3">
                      <p className="text-sm text-muted">
                        This removes your sign-in, points, titles, and personal pins. Public reviews
                        stay as “Deleted user.”
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={deleteStep === "working"}
                          onClick={() => setDeleteStep("idle")}
                        >
                          Keep account
                        </Button>
                        <Button
                          className="flex-1"
                          disabled={deleteStep === "working"}
                          onClick={() => {
                            setDeleteStep("working");
                            void deleteMyAccount({ data: {} })
                              .catch(() => undefined)
                              .then(() => {
                                clearKeptUser();
                                return endSessionNow("/");
                              })
                              .catch(() => {
                                clearKeptUser();
                                window.location.replace("/");
                              });
                          }}
                        >
                          {deleteStep === "working" ? "Deleting…" : "Delete forever"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-left text-[0.75rem] text-muted underline-offset-4 hover:underline"
                      onClick={() => setDeleteStep("confirm")}
                    >
                      Delete account
                    </button>
                  )}
                </div>
              ) : null}
            </section>

            <section className="mt-5">
              <h2 className="font-display text-xl font-semibold">Title shop</h2>
              <p className="mt-1 text-sm text-muted">{BADGES.length} titles. Scroll the list. Price is in points.</p>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {FILTERS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3 text-[0.75rem] font-medium",
                      filter === id ? "bg-primary text-primary-foreground" : "bg-surface text-foreground",
                    )}
                  >
                    {id === "all" ? `All (${BADGES.length})` : id === "owned" ? "Owned" : TIER_LABEL[id]}
                  </button>
                ))}
              </div>
              <ul className="mt-3 overflow-hidden rounded-[var(--radius-xl)] bg-surface">
                {rows.map((badge) => {
                  const action = shopAction({
                    badgeId: badge.id,
                    equippedId: equipped?.id ?? STARTER_BADGE_ID,
                    owned,
                    points,
                  });
                  return (
                    <li key={badge.id} className="flex items-center gap-3 border-b border-foreground/8 px-3 py-2.5 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <BadgeChip badge={badge} className="is-wrap" />
                        <p className="mt-1 text-[0.75rem] text-muted">
                          {shopPriceLabel(badge)} · {TIER_LABEL[badge.tier]}
                        </p>
                      </div>
                      {action === "equipped" ? (
                        <span className="shrink-0 text-[0.75rem] font-medium text-primary">Equipped</span>
                      ) : action === "equip" ? (
                        <Button size="sm" variant="outline" disabled={equipMutation.isPending} onClick={() => equipMutation.mutate(badge.id)}>
                          Equip
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={buyMutation.isPending || walletBusy || action === "need-points"}
                          onClick={() => buyMutation.mutate(badge.id)}
                        >
                          {action === "need-points" ? shopPriceLabel(badge) : `Buy · ${badge.cost}`}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
        </div>
      </div>
    </>
  );
}
