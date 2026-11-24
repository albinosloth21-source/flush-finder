import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { DeleteMyAccount } from "@/components/delete-my-account";
import { LogoMark, Wordmark } from "@/components/toilet-mark";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/delete-account")({
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
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
          <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Your account</p>
          <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">Delete my account</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Google Play asks for a web page where you can delete a Flush Finder account without
            installing anything else. This is that page. You can also do it in the app under Account
            → Titles → Delete my account.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>Removed: sign-in (Google, X, Apple, email, one-time codes), name, email, sessions, points, titles, and restrooms only you added.</li>
            <li>Kept, without your name: reviews you already published, shown as “Deleted user.”</li>
          </ul>
          <div className="mt-5">
            <DeleteMyAccount heading="Do it here" />
          </div>
          <p className="mt-4 text-[0.75rem] text-subtle">
            <Link to="/privacy" className="underline-offset-4 hover:underline">
              Privacy
            </Link>
            <span aria-hidden="true"> · </span>
            <Link to="/terms" className="underline-offset-4 hover:underline">
              Terms
            </Link>
          </p>
        </article>
      </div>
    </main>
  );
}
