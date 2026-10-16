import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/toilet-mark";
import { ToiletRating } from "@/components/toilet-rating";
import { clampSlide, markIntroSeen } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "ff:open-intro";

/** Re-open the tour (Account / help menu). Falls back to a reload when no map is mounted. */
export function openIntro() {
  if (typeof window === "undefined") return;
  const event = new Event(OPEN_EVENT, { cancelable: true });
  if (window.dispatchEvent(event)) {
    try {
      window.localStorage.removeItem("ff-intro-seen-v1");
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }
}

export function useIntroOpenEvent(onOpen: () => void) {
  const ref = useRef(onOpen);
  ref.current = onOpen;
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      ref.current();
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);
}

const SLIDES = [
  {
    eyebrow: "Snoop to Poop",
    title: "Find a throne anywhere",
    body: "Gas stations, groceries, cafés and parks, all on one map. Search a city or browse. When nature calls, you'll know where to answer.",
  },
  {
    eyebrow: "The five-toilet scale",
    title: "Rate the thrones",
    body: "From one toilet (hold it) to five toilets (fit for royalty). Score cleanliness, privacy and more so the next person knows what they're walking into.",
  },
  {
    eyebrow: "Points & titles",
    title: "Earn your crown",
    body: "Drop pins and write reviews to earn points, then spend them in the title shop. Go from Flush Newbie to Bathroom Connoisseur and beyond.",
  },
] as const;

export function FirstRunIntro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function finish() {
    markIntroSeen();
    onDone();
  }
  function go(next: number) {
    setIndex(clampSlide(next, SLIDES.length));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => clampSlide(i + 1, SLIDES.length));
      if (e.key === "ArrowLeft") setIndex((i) => clampSlide(i - 1, SLIDES.length));
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="ff-throne-intro fixed inset-0 z-[1000] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-roledescription="carousel"
      aria-label="Welcome to Flush Finder"
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null || Math.abs(end - start) < 40) return;
        go(index + (end < start ? 1 : -1));
      }}
    >
      <div className="flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" className="h-11 rounded-full px-4 text-sm font-medium text-[#f3e7c0]/85 hover:text-[#f3e7c0]" onClick={finish}>
          Skip
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="ff-throne-logo">
          <LogoMark className="size-28 rounded-[1.6rem]" />
        </div>
        <div key={index} className="ff-throne-slide mt-8" aria-live="polite">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">{slide.eyebrow}</p>
          <h2 className="ff-gold-text mt-2 font-display text-3xl font-semibold leading-tight">{slide.title}</h2>
          {index === 1 ? (
            <div className="mt-4 flex justify-center text-[#d4af37]" aria-hidden="true">
              <ToiletRating value={5} />
            </div>
          ) : null}
          <p className="mt-4 text-[0.98rem] leading-relaxed text-[#e9e2cf]/90">{slide.body}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-5 flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Screen ${i + 1} of ${SLIDES.length}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-[#d4af37]" : "w-2 bg-[#f3e7c0]/35")}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {index > 0 ? (
            <button type="button" aria-label="Back" className="grid size-12 place-items-center rounded-full border border-[#d4af37]/50 text-[#f3e7c0]" onClick={() => go(index - 1)}>
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          <button type="button" className="ff-gold-button flex-1" onClick={() => (last ? finish() : go(index + 1))}>
            {last ? "Take my seat" : "Next"}
            {last ? null : <ChevronRight className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
