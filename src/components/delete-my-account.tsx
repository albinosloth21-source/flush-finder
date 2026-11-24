import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteMyAccount } from "@/lib/account-delete";
import { clearAfterLogin, rememberAfterLogin } from "@/lib/after-login";
import { endSessionNow } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { clearKeptUser } from "@/lib/session-keep";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/constants";

export function DeleteMyAccount({ heading = "Delete my account" }: { heading?: string }) {
  const { user, isPending } = useCurrentUserState();
  const [step, setStep] = useState<"idle" | "confirm" | "working">("idle");

  useEffect(() => {
    clearAfterLogin();
  }, []);

  if (isPending && !user) {
    return <p className="text-sm text-muted">Checking your account…</p>;
  }

  if (!user) {
    return (
      <div>
        <h2 className="font-display text-lg font-semibold">{heading}</h2>
        <p className="mt-2 text-sm text-muted">
          Sign in on the web, then come back to this page. Deleting removes the account, email,
          sessions, points, titles, and personal pins. Reviews you already published stay on the map
          as “Deleted user.”
        </p>
        <Button asChild className="mt-4">
          <Link to="/login" onClick={() => rememberAfterLogin("/delete-account")}>
            Sign in to delete my account
          </Link>
        </Button>
        <p className="mt-3 text-[0.75rem] text-subtle">
          Can’t sign in? Email {PRIVACY_CONTACT_EMAIL}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold">{heading}</h2>
      <p className="mt-2 text-sm text-muted">
        Signed in as {user.displayName ?? user.primaryEmail ?? "your account"}. This removes the
        sign-in, points, titles, and personal pins. Public reviews stay as “Deleted user.”
      </p>
      {step === "idle" ? (
        <button
          type="button"
          className="mt-3 text-left text-sm font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => setStep("confirm")}
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-3 rounded-[var(--radius-lg)] bg-foreground/4 p-3">
          <p className="text-sm text-muted">This is permanent. The account cannot be signed into again.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" disabled={step === "working"} onClick={() => setStep("idle")}>
              Keep account
            </Button>
            <Button
              className="flex-1"
              disabled={step === "working"}
              onClick={() => {
                setStep("working");
                void deleteMyAccount({ data: {} })
                  .then(() => {
                    clearKeptUser();
                    return endSessionNow("/?account=deleted");
                  })
                  .catch(() => {
                    setStep("confirm");
                    toast.error("Couldn’t delete the account. Try again in a moment.");
                  });
              }}
            >
              {step === "working" ? "Deleting…" : "Delete forever"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
