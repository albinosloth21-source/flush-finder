import { useEffect, useState } from "react";
import { toast } from "sonner";
import { setPrivacyChoices } from "@/lib/privacy-choices-fn";
import { AGE_CONFIRM_KEY, parseAgeConfirmed } from "@/lib/age-gate";
import { MIN_AGE } from "@/lib/constants";
import {
  DEFAULT_PRIVACY_CHOICES,
  PRIVACY_SWITCH_LABEL,
  readLocalPrivacyChoices,
  resolveSaleOptIn,
  writeLocalPrivacyChoices,
  type PrivacyChoices,
} from "@/lib/privacy-choices";
import { cn } from "@/lib/utils";

function ageAtLeastMin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return parseAgeConfirmed(window.localStorage.getItem(AGE_CONFIRM_KEY));
  } catch {
    return false;
  }
}

export function PrivacyChoicesControl({
  className,
  signedIn = false,
}: {
  className?: string;
  signedIn?: boolean;
}) {
  const [local, setLocal] = useState<PrivacyChoices>(DEFAULT_PRIVACY_CHOICES);

  useEffect(() => {
    setLocal(readLocalPrivacyChoices());
  }, []);

  const allow = local.allowSaleAndAds;

  function toggle() {
    const turningOn = !allow;
    const ofAge = ageAtLeastMin();
    if (turningOn && !ofAge) {
      toast.error(`Only people ${MIN_AGE} or older can turn this on. Confirm your age on the sign-in screen first.`);
      return;
    }
    const next = { allowSaleAndAds: resolveSaleOptIn(turningOn, ofAge) };
    writeLocalPrivacyChoices(next);
    setLocal(next);
    toast.success(next.allowSaleAndAds ? "Personalized ads and data sale are on" : "Personalized ads and data sale are off");
    if (!signedIn) return;
    void setPrivacyChoices({ data: { ...next, ageAtLeastMin: ofAge } }).catch(() => {
      /* local choice already saved */
    });
  }

  return (
    <div className={cn("mt-4 rounded-[var(--radius-lg)] bg-foreground/4 p-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{PRIVACY_SWITCH_LABEL}</p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">
            Off by default. Only people {MIN_AGE} or older can turn it on. While it is off, Flush
            Finder does not sell or share your account for ads. The map still works.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allow}
          onClick={toggle}
          className={cn(
            "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors",
            allow ? "bg-primary" : "bg-foreground/20",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-6 rounded-full bg-surface shadow-sm transition-transform",
              allow ? "translate-x-5" : "translate-x-0",
            )}
          />
          <span className="sr-only">{allow ? "On" : "Off"}</span>
        </button>
      </div>
      <p className="mt-2 text-[0.6875rem] text-subtle">
        {allow ? "On · we may sell or share data and show personalized ads." : "Off · do not sell or share, and do not personalize ads."}
      </p>
    </div>
  );
}
