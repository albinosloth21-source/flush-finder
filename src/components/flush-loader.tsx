import { LogoMark } from "@/components/toilet-mark";
import { cn } from "@/lib/utils";

/** Gold water swirl that spins like a flush. Static gentle pulse under reduced motion. */
export function FlushLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("ff-flush-loader inline-block shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id="ff-flush-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e27a" />
          <stop offset="0.55" stopColor="#d4af37" />
          <stop offset="1" stopColor="#a67c1b" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#ff-flush-gold)" strokeLinecap="round">
        <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" strokeWidth="2.4" />
        <path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5 6.5 6.5 0 0 1-3 5.5" strokeWidth="2" opacity="0.85" />
        <path d="M12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5" strokeWidth="1.7" opacity="0.7" />
        <path d="M2.5 12A9.5 9.5 0 0 1 8 3.3" strokeWidth="1.6" opacity="0.45" />
      </g>
      <circle cx="12" cy="12" r="1.3" fill="#d4af37" />
    </svg>
  );
}

/** Larger loader: swirl orbiting the gold toilet logo. For map and sign-in waits. */
export function FlushLoaderLogo({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <div className="relative grid size-24 place-items-center">
        <FlushLoader className="absolute inset-0 size-24" />
        <LogoMark className="size-12 rounded-[0.8rem]" />
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}
