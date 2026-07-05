import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const tierVariants = {
  neutral: "bg-badge-neutral-bg text-badge-neutral-fg",
  warning: "bg-badge-warning-bg text-badge-warning-fg",
  success: "bg-badge-success-bg text-badge-success-fg",
  error: "bg-badge-error-bg text-badge-error-fg",
} as const;

const statusToTier: Record<string, keyof typeof tierVariants> = {
  pending: "neutral",
  assigned: "neutral",
  in_progress: "warning",
  pending_confirmation: "warning",
  open: "warning",
  under_review: "warning",
  sold_out: "warning",
  completed: "success",
  paid: "success",
  active: "success",
  resolved_override: "success",
  failed: "error",
  delisted: "error",
  cancelled: "error",
  resolved_refund_flagged: "error",
} as const;

type StatusBadgeProps = {
  variant?: keyof typeof tierVariants;
  status?: string;
} & HTMLAttributes<HTMLSpanElement>;

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, status, ...props }, ref) => {
    const resolvedVariant = variant ?? (status ? (statusToTier[status] ?? "neutral") : "neutral");
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.05em]",
          tierVariants[resolvedVariant],
          className,
        )}
        {...props}
      />
    );
  },
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, type StatusBadgeProps };
