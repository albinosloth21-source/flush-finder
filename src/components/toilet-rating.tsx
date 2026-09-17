import { ToiletMark } from "@/components/toilet-mark";
import { formatToiletScore, toiletFill, TOILET_MAX } from "@/lib/toilet-score";
import { cn } from "@/lib/utils";

type Props = {
  value: number | string | null;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
};

const sizeClass = { sm: "size-4", md: "size-6", lg: "size-8" };

export function ToiletRating({
  value,
  max = TOILET_MAX,
  size = "md",
  interactive = false,
  onChange,
  className,
}: Props) {
  const score = value == null || value === "" ? null : Number(value);
  const numeric = Number.isFinite(score as number) ? (score as number) : null;
  const label = formatToiletScore(numeric);
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} role={interactive ? "radiogroup" : "img"} aria-label={label}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const fill = interactive ? (n <= Math.round(numeric ?? 0) ? 1 : 0) : toiletFill(numeric, n);
        if (!interactive) return <ToiletGlyph key={n} fill={fill} size={size} />;
        return (
          <button key={n} type="button" role="radio" aria-checked={Math.round(numeric ?? 0) === n} aria-label={`${n} toilet${n === 1 ? "" : "s"}`} className="grid size-11 place-items-center" onClick={() => onChange?.(n)}>
            <ToiletGlyph fill={fill} size={size} />
          </button>
        );
      })}
    </div>
  );
}

function ToiletGlyph({ fill, size }: { fill: 0 | 0.5 | 1; size: "sm" | "md" | "lg" }) {
  if (fill === 1) return <ToiletMark filled className={cn(sizeClass[size], "text-primary")} />;
  if (fill === 0) return <ToiletMark filled={false} className={cn(sizeClass[size], "text-foreground/30")} />;
  return (
    <span className={cn("relative block overflow-hidden", sizeClass[size])}>
      <ToiletMark filled={false} className={cn("absolute inset-0", sizeClass[size], "text-foreground/30")} />
      <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
        <ToiletMark filled className={cn(sizeClass[size], "text-primary")} />
      </span>
    </span>
  );
}
