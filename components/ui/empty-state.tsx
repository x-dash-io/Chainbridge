import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
};

const defaultIcon = (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    className="h-10 w-10 text-muted"
    aria-hidden
  >
    <rect
      x="6"
      y="10"
      width="28"
      height="20"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M6 18h28"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M18 24l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function EmptyState({
  icon = defaultIcon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 py-16 text-center",
        className,
      )}
    >
      <div className="text-muted">{icon}</div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-muted">{title}</p>
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
