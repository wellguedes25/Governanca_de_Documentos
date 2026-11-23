import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors focus:border-[var(--lime)] focus:outline-none focus:ring-2 focus:ring-[var(--lime)]/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
