import { useEffect, useState } from "react";
import { toast } from "sonner";
import { setPrivacyChoices } from "@/lib/privacy-choices-fn";
import {
  DEFAULT_PRIVACY_CHOICES,
  readLocalPrivacyChoices,
  writeLocalPrivacyChoices,
  type PrivacyChoices,
} from "@/lib/privacy-choices";
import { cn } from "@/lib/utils";

export function PrivacyChoicesControl({ className, signedIn = false }: { className?: string; signedIn?: boolean }) {
  const [local, setLocal] = useState<PrivacyChoices>(DEFAULT_PRIVACY_CHOICES);
  useEffect(() => { setLocal(readLocalPrivacyChoices()); }, []);
  const allow = local.allowSaleAndAds;
  function toggle() {
    const next = { allowSaleAndAds: !allow };
    writeLocalPrivacyChoices(next);
    setLocal(next);
    toast.success(next.allowSaleAndAds ? "Personalized ads and data sale are on" : "Personalized ads and data sale are off");
    if (!signedIn) return;
    void setPrivacyChoices({ data: next }).catch(() => undefined);
  }
  return (
    <div className={cn("mt-4 rounded-[var(--radius-lg)] bg-foreground/4 p-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Sell my data & personalized ads</p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">
            This is also your “Do Not Sell My Personal Information” control.
          </p>
        </div>
        <button type="button" role="switch" aria-checked={allow} onClick={toggle} className={cn("relative mt-0.5 h-7 w-12 shrink-0 rounded-full", allow ? "bg-primary" : "bg-foreground/20")}>
          <span className={cn("absolute top-0.5 left-0.5 size-6 rounded-full bg-surface shadow-sm transition-transform", allow ? "translate-x-5" : "translate-x-0")} />
        </button>
      </div>
    </div>
  );
}
