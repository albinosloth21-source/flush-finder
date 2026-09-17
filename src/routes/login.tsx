import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { LogoMark, Wordmark } from "@/components/toilet-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <div className="h-10 w-48 animate-pulse rounded-md bg-foreground/8" />
      </main>
    );
  }
  if (user) return <Navigate to="/" />;

  async function onOAuth(providerId: string) {
    setError(null);
    setBusy(true);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  async function onEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Guest",
          callbackURL: "/confirm-email",
        });
        if (signUpError) throw new Error(signUpError.message ?? "Could not create that account");
        window.location.href = "/confirm-email";
        return;
      }
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
        rememberMe: true,
      });
      if (signInError) throw new Error(signInError.message ?? "Could not sign in");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <LogoMark className="size-14" />
          <div className="min-w-0">
            <Wordmark className="h-9 max-w-[16rem] sm:h-10 sm:max-w-[18rem]" />
            <p className="mt-1 text-sm text-muted">Verified accounts can review. Guests can browse.</p>
          </div>
        </div>

        <div className="ff-sheet mt-6 rounded-[var(--radius-2xl)] bg-surface p-5 shadow-[var(--shadow-border)]">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {mode === "signup" ? "Create an account" : "Sign in"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Confirm your email to rate restrooms. Or continue as a guest to look around.
          </p>

          {authEnabled ? (
            <div className="mt-5 grid gap-2">
              {GROK_PROVIDERS.map((provider) => (
                <Button
                  key={provider.providerId}
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void onOAuth(provider.providerId)}
                >
                  Continue with {provider.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">Sign-in is disabled.</p>
          )}

          <div className="my-5 flex items-center gap-3 text-[0.75rem] tracking-[0.14em] text-subtle uppercase">
            <span className="h-px flex-1 bg-foreground/10" />
            Email
            <span className="h-px flex-1 bg-foreground/10" />
          </div>

          <form className="grid gap-3" onSubmit={(event) => void onEmail(event)}>
            {mode === "signup" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  placeholder="What should reviews show?"
                />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@email.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy || !authEnabled}>
              {mode === "signup" ? "Create account" : "Sign in with email"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 text-sm text-muted underline-offset-4 hover:underline"
            onClick={() => {
              setMode((m) => (m === "signup" ? "signin" : "signup"));
              setError(null);
            }}
          >
            {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>

        <Link
          to="/"
          className={cn(
            "mt-4 flex h-11 items-center justify-center rounded-md text-sm font-medium text-muted",
            "hover:bg-foreground/5 hover:text-foreground",
          )}
        >
          Continue as guest
        </Link>
        <Link
          to="/privacy"
          className="mt-3 text-center text-[0.75rem] text-subtle underline-offset-4 hover:underline"
        >
          Privacy policy · Do not sell or share
        </Link>
        <p className="mt-2 text-center text-[0.75rem] text-subtle">
          Guests can find restrooms and read verified reviews. They cannot post.
        </p>
      </div>
    </main>
  );
}
