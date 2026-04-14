import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold text-xs uppercase tracking-widest transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)] hover:bg-[var(--primary-dark)]",
        destructive:
          "bg-[var(--destructive)] text-white hover:bg-red-600",
        outline:
          "border border-[var(--border)] bg-white text-slate-700 hover:bg-[var(--accent)] hover:text-[var(--primary)] hover:border-[var(--primary)]",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost:
          "text-slate-500 hover:bg-[var(--accent)] hover:text-[var(--primary)]",
        link:
          "text-[var(--primary)] underline-offset-4 hover:underline",
        cta:
          "bg-[var(--cta)] text-white hover:bg-orange-600 shadow-lg",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-[var(--radius)]",
        sm: "h-7 px-3 text-[10px] rounded-[var(--radius)]",
        lg: "h-11 px-6 text-sm rounded-[var(--radius)]",
        icon: "h-9 w-9 rounded-[var(--radius)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
