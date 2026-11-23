import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-default",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-[var(--lime)] border border-[var(--tint-olive-border)] px-2.5 py-0.5 rounded-full",
        success:
          "bg-[var(--accent)] text-[var(--lime)] border border-[var(--tint-olive-border)] px-2.5 py-0.5 rounded-full",
        warning:
          "bg-amber-500/15 text-amber-300 border border-amber-400/25 px-2.5 py-0.5 rounded-full",
        destructive:
          "bg-rose-500/15 text-rose-300 border border-rose-400/25 px-2.5 py-0.5 rounded-full",
        outline:
          "border border-[var(--border-strong)] text-[var(--foreground-secondary)] bg-[var(--card-subtle)] px-2.5 py-0.5 rounded-full",
        live:
          "bg-[var(--accent)] text-[var(--lime)] border border-[var(--tint-olive-border)] px-2.5 py-0.5 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
