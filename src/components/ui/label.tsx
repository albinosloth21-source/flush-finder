import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-[0.8125rem] font-medium text-foreground", className)} {...props} />
  );
}

export { Label };
