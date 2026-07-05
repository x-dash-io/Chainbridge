"use client";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

type LegStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";

export type OrderLeg = {
  id: string;
  roleLabel: string;
  status: LegStatus;
  amount?: string;
  timestamp?: string;
  assignee?: string;
};

type OrderLegTrackerProps = {
  legs: OrderLeg[];
  isAdmin?: boolean;
  onLegClick?: (leg: OrderLeg) => void;
};

const statusLabel: Record<LegStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Complete",
  cancelled: "Cancelled",
};

const nodeCircle = {
  pending: "border-2 border-muted bg-card",
  assigned: "border-2 border-accent bg-accent",
  in_progress: "border-2 border-accent bg-accent",
  completed: "border-2 border-primary bg-primary",
  cancelled: "border-2 border-destructive bg-destructive",
};

const connectorLine = {
  pending: "bg-muted",
  assigned: "bg-accent",
  in_progress: "bg-accent",
  completed: "bg-primary",
  cancelled: "bg-destructive",
};

const connectorStroke = {
  pending: "text-muted",
  assigned: "text-accent",
  in_progress: "text-accent",
  completed: "text-primary",
  cancelled: "text-destructive",
};

function LegNodeIcon({ status }: { status: LegStatus }) {
  if (status === "completed") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="h-3.5 w-3.5 text-primary-foreground"
        aria-hidden
      >
        <path
          d="M4 8l2.5 2.5L12 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "assigned" || status === "in_progress") {
    return <span className="h-2 w-2 rounded-full bg-card" aria-hidden />;
  }
  if (status === "cancelled") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="h-3.5 w-3.5 text-destructive-foreground"
        aria-hidden
      >
        <path
          d="M5 5l6 6M11 5l-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return null;
}

const labelColor: Record<LegStatus, string> = {
  pending: "text-muted",
  assigned: "text-accent-foreground",
  in_progress: "text-accent-foreground",
  completed: "text-primary",
  cancelled: "text-destructive",
};

function OrderLegCard({
  leg,
  isAdmin,
  onLegClick,
}: {
  leg: OrderLeg;
  isAdmin?: boolean;
  onLegClick?: (leg: OrderLeg) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3 min-w-[140px]">
      <button
        type="button"
        disabled={!isAdmin}
        onClick={() => onLegClick?.(leg)}
        className={cn(
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150",
          nodeCircle[leg.status],
          isAdmin && "cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !isAdmin && "cursor-default",
        )}
        aria-label={`${leg.roleLabel}: ${statusLabel[leg.status]}${isAdmin ? " (click to override)" : ""}`}
      >
        <LegNodeIcon status={leg.status} />
      </button>

      <div className="flex flex-col items-center gap-1 text-center">
        <span className={cn("text-sm font-semibold", labelColor[leg.status])}>
          {leg.roleLabel}
        </span>
        <span className="text-xs text-muted">{statusLabel[leg.status]}</span>
        {leg.amount && (
          <span className="text-xs font-medium text-foreground">
            {leg.amount}
          </span>
        )}
        {leg.timestamp && (
          <span className="text-xs text-muted">{leg.timestamp}</span>
        )}
        {leg.assignee && (
          <span className="text-xs text-muted">{leg.assignee}</span>
        )}
      </div>

      {isAdmin && (
        <span className="text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
          Click to override
        </span>
      )}
    </div>
  );
}

function NodeButton({ leg, isAdmin, onLegClick }: { leg: OrderLeg; isAdmin?: boolean; onLegClick?: (leg: OrderLeg) => void; }) {
  return (
    <div className="flex flex-col items-center min-w-[140px]">
      <button
        type="button"
        disabled={!isAdmin}
        onClick={() => onLegClick?.(leg)}
        className={cn(
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150",
          nodeCircle[leg.status],
          isAdmin && "cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !isAdmin && "cursor-default",
        )}
        aria-label={`${leg.roleLabel}: ${statusLabel[leg.status]}${isAdmin ? " (click to override)" : ""}`}
      >
        <LegNodeIcon status={leg.status} />
      </button>
    </div>
  );
}

export function OrderLegTracker({
  legs,
  isAdmin = false,
  onLegClick,
}: OrderLegTrackerProps) {
  if (legs.length === 0) return <EmptyState title="No order legs yet" />;

  return (
    <div className="w-full">
      <div className="hidden md:flex md:flex-col md:gap-4">
        {legs.map((leg, i) => (
          <div key={leg.id} className="group flex gap-4">
            <div className="flex flex-col items-center">
              <NodeButton leg={leg} isAdmin={isAdmin} onLegClick={onLegClick} />
              {i < legs.length - 1 && (
                <div className="flex items-center">
                  <svg
                    className={cn("mt-2 h-12 w-4", connectorStroke[leg.status])}
                    viewBox="0 0 8 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M4 0 L4 14"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <polygon points="2,16 4,20 6,16" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1 pb-6 pt-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", labelColor[leg.status])}>
                  {leg.roleLabel}
                </span>
                <span className="text-xs text-muted">{statusLabel[leg.status]}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                {leg.amount && <span>{leg.amount}</span>}
                {leg.timestamp && <span>{leg.timestamp}</span>}
                {leg.assignee && <span>{leg.assignee}</span>}
              </div>
              {isAdmin && (
                <span className="text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                  Click to override
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0 md:hidden">
        {legs.map((leg, i) => (
          <div key={leg.id} className="group flex gap-4">
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => onLegClick?.(leg)}
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150",
                  nodeCircle[leg.status],
                  isAdmin && "cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !isAdmin && "cursor-default",
                )}
                aria-label={`${leg.roleLabel}: ${statusLabel[leg.status]}${isAdmin ? " (click to override)" : ""}`}
              >
                <LegNodeIcon status={leg.status} />
              </button>
              {i < legs.length - 1 && (
                <div className="mt-2 flex w-full justify-center">
                  <svg
                    className={cn("h-12 w-4", connectorStroke[leg.status])}
                    viewBox="0 0 8 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M4 0 L4 14"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <polygon points="2,16 4,20 6,16" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1 pb-6 pt-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", labelColor[leg.status])}>
                  {leg.roleLabel}
                </span>
                <span className="text-xs text-muted">{statusLabel[leg.status]}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                {leg.amount && <span>{leg.amount}</span>}
                {leg.timestamp && <span>{leg.timestamp}</span>}
                {leg.assignee && <span>{leg.assignee}</span>}
              </div>
              {isAdmin && (
                <span className="text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                  Click to override
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderLegTrackerSkeleton() {
  return (
    <div className="flex w-full items-stretch">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-1 items-stretch">
          <div className="flex flex-1 flex-col items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-border" />
            <div className="flex flex-col items-center gap-1">
              <div className="h-4 w-20 animate-pulse rounded bg-border" />
              <div className="h-3 w-14 animate-pulse rounded bg-border" />
              <div className="h-3 w-16 animate-pulse rounded bg-border" />
            </div>
          </div>
          {i < 4 && (
            <div className="flex items-center">
              <div className="h-0.5 w-16 animate-pulse bg-border" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
