import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/toilet-mark";
import { Button } from "@/components/ui/button";
import { PrivacyChoicesControl } from "@/components/privacy-choices";
import { PrivacyPolicyText, PRIVACY_UPDATED } from "@/components/privacy-policy";
import { usePersistentUser } from "@/lib/session-keep";

export const Route = createFileRoute("/privacy")({ component: Privacy });

export { PRIVACY_UPDATED };

function Privacy() {
  const { user } = usePersistentUser();
  return (
    <main className="fixed inset-0 overflow-y-auto bg-background px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Back">
            <Link to="/">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <LogoMark className="size-10" />
          <Wordmark className="h-7 max-w-[12rem]" />
        </div>
        <article className="ff-sheet mt-4 rounded-[var(--radius-xl)] bg-surface p-4 sm:p-6">
          <PrivacyChoicesControl signedIn={Boolean(user)} />
          <PrivacyPolicyText />
        </article>
        <p className="mt-4 text-center text-[0.75rem] text-subtle">
          <Link to="/" className="underline-offset-4 hover:underline">
            Back to the map
          </Link>
        </p>
      </div>
    </main>
  );
}
