"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variantStyles = {
  primary:
    "bg-primary text-primary-foreground hover:bg-[#166B24] active:scale-[0.98]",
  accent:
    "bg-accent text-accent-foreground hover:bg-[#E89A1F] active:scale-[0.98]",
  secondary:
    "border border-border bg-card text-foreground hover:bg-[#F0F0EE] active:scale-[0.98]",
  ghost:
    "text-foreground hover:bg-[#F0F0EE] active:scale-[0.98]",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-[#B71C1C] active:scale-[0.98]",
} as const;

const sizeStyles = {
  sm: "min-h-8 px-3 py-1.5 text-sm gap-1.5",
  md: "min-h-10 px-4 py-2 text-base gap-2",
  lg: "min-h-12 px-6 py-3 text-base gap-2",
} as const;

type ButtonProps = {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex min-w-0 items-center justify-center rounded-[var(--radius)] text-center font-medium leading-tight transition-all duration-150 cursor-pointer whitespace-normal break-words",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, type ButtonProps };
