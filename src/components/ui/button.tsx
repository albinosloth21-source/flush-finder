import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-medium whitespace-nowrap outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-transparent bg-surface-2 text-foreground hover:bg-surface-2/80",
        outline: "border-border bg-surface text-foreground hover:bg-surface-2",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-foreground/6",
        danger: "border-transparent bg-danger text-primary-foreground hover:bg-danger/90",
        good: "border-transparent bg-good text-primary-foreground hover:bg-good/90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-[0.8125rem]",
        lg: "h-12 px-5",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className, variant, size, asChild = false, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
