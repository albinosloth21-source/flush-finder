import { useEffect, useRef, useState } from "react";
import { Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isNativeApp } from "@/lib/native";

const DISMISS_KEY = "ff-install-v1";
type Mode = "hidden" | "ios" | "android";
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallPrompt({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (isStandalone() || isNativeApp()) return;
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (ios) setMode("ios");
    else if (android) setMode("android");
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (mode === "hidden") return null;
  async function installAndroid() {
    const event = deferred.current;
    if (event) {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") dismiss();
      return;
    }
    dismiss();
  }
  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  }
  return (
    <div className={cn("mt-3 rounded-[var(--radius-lg)] bg-surface-2 p-3 shadow-[var(--shadow-border)]", className)}>
      <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
        <Smartphone className="size-4 text-primary" />
        {mode === "ios" ? "Add Flush Finder to your iPhone" : "Install Flush Finder on your phone"}
      </p>
      <div className="mt-2.5 flex gap-2">
        {mode === "ios" ? (
          <Button size="sm" className="flex-1" asChild>
            <a href="/?install=1&platform=ios"><Share className="size-4" /> Show me how</a>
          </Button>
        ) : (
          <Button size="sm" className="flex-1" onClick={() => void installAndroid()}>
            <Smartphone className="size-4" /> {deferred.current ? "Install" : "Got it"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
      </div>
    </div>
  );
}
