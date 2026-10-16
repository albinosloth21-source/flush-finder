import { useEffect, useRef, useState } from "react";
import { CircleHelp, MessageSquareHeart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openFeedback } from "@/components/feedback-sheet";
import { openIntro } from "@/components/first-run-intro";

/** Small header help menu: replay the intro, send feedback. Works for guests. */
export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" aria-label="Help and feedback" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <CircleHelp className="size-4" />
      </Button>
      {open ? (
        <div role="menu" className="ff-sheet absolute right-0 top-full z-50 mt-1 w-52 rounded-[var(--radius-lg)] bg-surface p-1.5 shadow-[var(--shadow-border)]">
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm hover:bg-foreground/5"
            onClick={() => {
              setOpen(false);
              openIntro();
            }}
          >
            <Sparkles className="size-4 text-[#a67c1b]" />
            How it works
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm hover:bg-foreground/5"
            onClick={() => {
              setOpen(false);
              openFeedback();
            }}
          >
            <MessageSquareHeart className="size-4 text-[#a67c1b]" />
            Send feedback
          </button>
        </div>
      ) : null}
    </div>
  );
}
