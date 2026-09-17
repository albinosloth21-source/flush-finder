import { cn } from "@/lib/utils";
import type { BadgeDef } from "@/lib/badges";

export function BadgeChip({
  badge,
  size = "md",
  className,
}: {
  badge: BadgeDef;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("ff-title-badge", `is-${badge.tone}`, `cut-${badge.cut}`, size === "sm" && "is-sm", size === "lg" && "is-lg", className)}>
      {badge.title}
    </span>
  );
}
