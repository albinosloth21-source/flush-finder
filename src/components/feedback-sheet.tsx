import { useEffect, useRef, useState } from "react";
import { MessageSquareHeart, X } from "lucide-react";
import { toast } from "sonner";
import { FlushLoader } from "@/components/flush-loader";
import { LogoMark } from "@/components/toilet-mark";
import { Button } from "@/components/ui/button";
import {
  APP_VERSION,
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABELS,
  FEEDBACK_MAX_CHARS,
  approxCoord,
  feedbackProblem,
  type FeedbackKind,
} from "@/lib/feedback";
import { sendFeedback } from "@/lib/feedback-fn";
import { usePersistentUser } from "@/lib/session-keep";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "ff:open-feedback";
let lastMapCenter: { lat: number; lng: number } | null = null;

/** The map reports its current center here. Never requests location. */
export function setFeedbackMapCenter(center: { lat: number; lng: number } | null) {
  lastMapCenter = center;
}

export function openFeedback() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

export function FeedbackButton({ className, label = "Send feedback" }: { className?: string; label?: string }) {
  return (
    <Button variant="outline" className={className} onClick={openFeedback}>
      <MessageSquareHeart className="size-4" />
      {label}
    </Button>
  );
}

function throneToast() {
  toast.custom(
    () => (
      <div className="ff-throne-toast" role="status">
        <LogoMark className="size-9" />
        <div>
          <p className="font-display text-[0.95rem] font-semibold">Delivered to the throne room</p>
          <p className="text-[0.8rem] opacity-80">Thanks! The royal plumbers will take a look.</p>
        </div>
      </div>
    ),
    { duration: 4000 },
  );
}

/** Mounted once in the root layout; opened with openFeedback(). */
export function FeedbackHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  return open ? <FeedbackSheet onClose={() => setOpen(false)} /> : null;
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { user } = usePersistentUser();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const problem = feedbackProblem({ kind, message, email: user ? "" : email });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendFeedback({
        data: {
          kind,
          message: message.trim(),
          email: user ? "" : email.trim(),
          appVersion: APP_VERSION,
          route: `${window.location.pathname}${window.location.search}`.slice(0, 300),
          userAgent: navigator.userAgent.slice(0, 500),
          mapLat: approxCoord(lastMapCenter?.lat),
          mapLng: approxCoord(lastMapCenter?.lng),
        },
      });
      throneToast();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that. Try again?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/45 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ff-feedback-title"
        className="ff-throne-sheet w-full max-w-md rounded-t-[var(--radius-2xl)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-[var(--radius-2xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <LogoMark className="size-10" />
          <div className="min-w-0 flex-1">
            <h2 id="ff-feedback-title" className="ff-gold-text font-display text-xl font-semibold">
              Send feedback
            </h2>
            <p className="text-sm text-[#e9e2cf]/80">Found a clog in the app? Got a royal idea? Tell us.</p>
          </div>
          <button type="button" aria-label="Close" className="grid size-9 place-items-center rounded-full text-[#e9e2cf] hover:bg-white/10" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-1.5" role="radiogroup" aria-label="Feedback type">
          {FEEDBACK_KINDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={kind === id}
              onClick={() => setKind(id)}
              className={cn("ff-throne-chip", kind === id && "is-on")}
            >
              {FEEDBACK_KIND_LABELS[id]}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-sm font-medium text-[#f3e7c0]" htmlFor="ff-feedback-message">
          Message
        </label>
        <textarea
          id="ff-feedback-message"
          ref={textRef}
          required
          maxLength={FEEDBACK_MAX_CHARS}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={kind === "bug" ? "What happened, and what did you expect?" : "Tell us what you're thinking"}
          className="mt-1 w-full resize-none rounded-[var(--radius-md)] border border-[#d4af37]/40 bg-black/20 p-3 text-sm text-[#f7f2e3] placeholder:text-[#e9e2cf]/50 focus:border-[#d4af37] focus:outline-none"
        />
        <p className="text-right text-[0.7rem] text-[#e9e2cf]/60">
          {message.length}/{FEEDBACK_MAX_CHARS}
        </p>

        {!user ? (
          <>
            <label className="block text-sm font-medium text-[#f3e7c0]" htmlFor="ff-feedback-email">
              Email <span className="font-normal opacity-70">(optional, if you'd like a reply)</span>
            </label>
            <input
              id="ff-feedback-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[#d4af37]/40 bg-black/20 px-3 text-sm text-[#f7f2e3] focus:border-[#d4af37] focus:outline-none"
            />
          </>
        ) : null}

        <p className="mt-3 text-[0.7rem] leading-snug text-[#e9e2cf]/60">
          We also attach the app version, the screen you're on, your browser type, and the rough map area you're
          viewing (never your location).
        </p>
        {error ? <p className="mt-2 text-sm text-[#ffb4a8]" role="alert">{error}</p> : null}

        <button type="button" className="ff-gold-button mt-3 w-full" disabled={busy || !message.trim()} onClick={() => void submit()}>
          {busy ? <FlushLoader className="size-4" /> : null}
          {busy ? "Sending…" : "Send to the throne room"}
        </button>
      </div>
    </div>
  );
}
