import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { LogoMark, Wordmark } from "@/components/toilet-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmEmail, getReviewer, requestEmailCode } from "@/lib/reviewer";

export const Route = createFileRoute("/confirm-email")({ component: ConfirmEmail });

function ConfirmEmail() {
  const { user, isPending } = useCurrentUserState();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const reviewerQuery = useQuery({
    queryKey: ["reviewer"],
    queryFn: () => getReviewer(),
    enabled: Boolean(user),
  });

  const requestMutation = useMutation({
    mutationFn: () => requestEmailCode(),
    onSuccess: (result) => {
      if (result.confirmed) {
        void queryClient.invalidateQueries({ queryKey: ["reviewer"] });
        return;
      }
      setPreviewCode(result.previewCode);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmEmail({ data: { code } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviewer"] });
    },
  });

  useEffect(() => {
    if (!user || reviewerQuery.data?.confirmed) return;
    if (requestMutation.isPending || requestMutation.isSuccess || previewCode) return;
    requestMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reviewerQuery.data?.confirmed]);

  if (isPending) {
    return <main className="grid min-h-dvh place-items-center bg-background text-sm text-muted">Checking account…</main>;
  }
  if (!user) return <RedirectToSignIn />;

  if (reviewerQuery.data?.confirmed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4">
        <div className="max-w-sm text-center">
          <LogoMark className="mx-auto size-16" />
          <Wordmark className="mx-auto mt-3 h-8 max-w-[16rem]" />
          <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight">You are verified</h1>
          <p className="mt-2 text-sm text-muted">You can rate restrooms in toilets and leave a typed critique.</p>
          <Button className="mt-5" asChild>
            <Link to="/">Back to the map</Link>
          </Button>
        </div>
      </main>
    );
  }

  const error =
    (confirmMutation.error instanceof Error && confirmMutation.error.message) ||
    (requestMutation.error instanceof Error && requestMutation.error.message) ||
    null;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <LogoMark className="size-14" />
        <Wordmark className="mt-3 h-8 max-w-[16rem]" />
        <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight">Confirm your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Only confirmed accounts can leave reviews. Google and X sign-in count as confirmed.
          For email sign-up, enter the 6-digit code for{" "}
          <span className="text-foreground">{reviewerQuery.data?.email ?? user.primaryEmail ?? "your address"}</span>.
        </p>

        {previewCode ? (
          <div className="mt-5 rounded-[var(--radius-lg)] bg-foreground/5 p-4">
            <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Your code</p>
            <p className="font-display mt-1 text-3xl tracking-[0.24em]">{previewCode}</p>
            <p className="mt-2 text-[0.75rem] text-subtle">
              This app cannot send mail from here, so the code is shown once. Type it below to confirm the address.
            </p>
          </div>
        ) : null}

        <form
          className="mt-5 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            confirmMutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={code.length !== 6 || confirmMutation.isPending}>
            Confirm email
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={requestMutation.isPending}
            onClick={() => requestMutation.mutate()}
          >
            Send a new code
          </Button>
        </form>

        <Link to="/" className="mt-6 inline-flex text-sm text-muted underline-offset-4 hover:underline">
          Continue as guest instead
        </Link>
      </div>
    </main>
  );
}
