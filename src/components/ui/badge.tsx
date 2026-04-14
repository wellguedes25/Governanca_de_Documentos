import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-black text-[9px] uppercase tracking-widest transition-colors cursor-default",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-0.5 rounded-[var(--radius)]",
        success:
          "bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-[var(--radius)]",
        warning:
          "bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-[var(--radius)]",
        destructive:
          "bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-[var(--radius)]",
        outline:
          "border border-[var(--border)] text-slate-500 px-2 py-0.5 rounded-[var(--radius)]",
        live:
          "bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-[var(--radius)]",
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
