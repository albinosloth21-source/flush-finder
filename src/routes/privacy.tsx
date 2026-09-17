import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/toilet-mark";
import { Button } from "@/components/ui/button";
import { PrivacyChoicesControl } from "@/components/privacy-choices";
import { PrivacyPolicyText } from "@/components/privacy-policy";
import { usePersistentUser } from "@/lib/session-keep";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  const { user } = usePersistentUser();
  return (
    <main className="fixed inset-0 overflow-y-auto bg-background px-4 pt-4 pb-8">
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
        <article className="mt-4 rounded-2xl bg-surface p-4 sm:p-6">
          <PrivacyChoicesControl signedIn={Boolean(user)} />
          <PrivacyPolicyText />
        </article>
      </div>
    </main>
  );
}
