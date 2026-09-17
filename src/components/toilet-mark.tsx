import { cn } from "@/lib/utils";

export function ToiletMark({ filled = true, className, title }: { filled?: boolean; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true} className={cn("shrink-0", className)}>
      {title ? <title>{title}</title> : null}
      <path d="M8.2 2.4h7.6c.7 0 1.2.5 1.2 1.1v3.3c0 .6-.5 1.1-1.2 1.1H8.2c-.7 0-1.2-.5-1.2-1.1V3.5c0-.6.5-1.1 1.2-1.1Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.1 7.9h5.8c3.1 0 5.4 2.1 5.4 5.3 0 4.2-3.7 7.4-8.3 7.4S3.7 17.4 3.7 13.2c0-3.2 2.3-5.3 5.4-5.3Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {filled ? (
        <ellipse cx="12" cy="13.4" rx="3.6" ry="2.5" fill="var(--color-surface-2)" />
      ) : (
        <ellipse cx="12" cy="13.4" rx="3.6" ry="2.5" stroke="currentColor" strokeWidth="1.4" />
      )}
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <img src="/brand/logo-gold-toilet.jpg" alt="" className={cn("block shrink-0 rounded-[0.7rem] object-cover", className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return <img src="/brand/wordmark-flush-finder.png" alt="Flush Finder" className={cn("block h-7 w-auto max-w-[9.5rem] object-contain object-left", className)} />;
}
