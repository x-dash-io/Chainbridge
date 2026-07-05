"use client";

import { useState, useActionState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  acceptJob,
  startJob,
  completeJob,
  getAvailableJobs,
  getMyJobs,
} from "@/lib/orders/job-queue-actions";
import type { JobItem } from "@/lib/orders/job-queue-actions";

type Props = {
  availableJobs: JobItem[];
  myJobs: JobItem[];
  roleLabel: string;
  role: string;
  userId: string;
};

const statusVariant: Record<
  string,
  "neutral" | "success" | "warning" | "error"
> = {
  pending: "neutral",
  assigned: "neutral",
  in_progress: "warning",
  completed: "success",
  paid: "success",
};

const statusLabel: Record<string, string> = {
  pending: "Available",
  assigned: "Accepted",
  in_progress: "In Progress",
  completed: "Complete",
  paid: "Paid",
};

function JobCard({
  job,
  action,
  actionLabel,
  onAction,
  isPending,
}: {
  job: JobItem;
  action: "accept" | "start" | "complete";
  actionLabel: string;
  onAction: (formData: FormData) => void;
  isPending: boolean;
}) {
  return (
    <Card className="transition-all duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{job.productName}</CardTitle>
            <CardDescription>
              ×{job.quantity} — KES {job.totalAmount}
            </CardDescription>
          </div>
          <StatusBadge variant={statusVariant[job.status] ?? "neutral"}>
            {statusLabel[job.status] ?? job.status}
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted">
            Reward: <strong className="text-foreground">KES {job.amount}</strong>
          </span>
          <span className="text-muted">
            Consumer: <strong className="text-foreground">{job.consumerName}</strong>
          </span>
        </div>
        {job.assignedAt && (
          <span className="text-xs text-muted">
            Accepted: {new Date(job.assignedAt).toLocaleDateString()}
          </span>
        )}
      </CardContent>

      <CardFooter>
        <form action={onAction}>
          <input type="hidden" name="legId" value={job.legId} />
          <Button
            type="submit"
            variant={action === "accept" ? "primary" : "accent"}
            size="sm"
            disabled={isPending}
          >
            {isPending ? "Processing..." : actionLabel}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

export function JobQueue({ availableJobs: initialAvailable, myJobs: initialMy, roleLabel, role, userId }: Props) {
  const [tab, setTab] = useState<"available" | "my">("available");
  const router = useRouter();

  const [availableJobs, setAvailableJobs] = useState(initialAvailable);
  const [myJobs, setMyJobs] = useState(initialMy);

  const refresh = useCallback(async () => {
    const [avail, mine] = await Promise.all([
      getAvailableJobs(role),
      getMyJobs(userId, role),
    ]);
    setAvailableJobs(avail);
    setMyJobs(mine);
  }, [role, userId]);

  useEffect(() => {
    setAvailableJobs(initialAvailable);
    setMyJobs(initialMy);
  }, [initialAvailable, initialMy]);

  // Poll for fresh jobs every 20s
  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const [acceptState, acceptAction, acceptPending] = useActionState(acceptJob, null);
  const [startState, startAction, startPending] = useActionState(startJob, null);
  const [completeState, completeAction, completePending] = useActionState(completeJob, null);

  useEffect(() => { if (acceptState?.success) refresh(); }, [acceptState, refresh]);
  useEffect(() => { if (startState?.success) refresh(); }, [startState, refresh]);
  useEffect(() => { if (completeState?.success) refresh(); }, [completeState, refresh]);

  const pendingJobs = myJobs.filter(
    (j) => j.status === "assigned" || j.status === "in_progress",
  );
  const completedJobs = myJobs.filter((j) => j.status === "completed");

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border">
        <button
          type="button"
          onClick={() => setTab("available")}
          className={cn(
            "px-4 py-3 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            tab === "available"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          Available Jobs
          {availableJobs.length > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {availableJobs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("my")}
          className={cn(
            "px-4 py-3 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            tab === "my"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          My Jobs
          {pendingJobs.length > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              {pendingJobs.length} active
            </span>
          )}
        </button>
      </div>

      {/* Available Jobs tab */}
      {tab === "available" && (
        <div className="flex flex-col gap-4">
          {availableJobs.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  viewBox="0 0 40 40"
                  fill="none"
                  className="h-10 w-10 text-muted"
                  aria-hidden
                >
                  <rect
                    x="4"
                    y="8"
                    width="32"
                    height="24"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4 16h32"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M16 22l3 3 6-6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="No available jobs"
              message={`New ${roleLabel.toLowerCase()} jobs will appear here when a consumer orders a product with your service included.`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {availableJobs.map((job) => (
                <JobCard
                  key={job.legId}
                  job={job}
                  action="accept"
                  actionLabel="Accept Job"
                  onAction={acceptAction}
                  isPending={acceptPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Jobs tab */}
      {tab === "my" && (
        <div className="flex flex-col gap-4">
          {myJobs.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  viewBox="0 0 40 40"
                  fill="none"
                  className="h-10 w-10 text-muted"
                  aria-hidden
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M14 20l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="No jobs yet"
              message="Accept an available job to see it here."
            />
          ) : (
            <>
              {/* Active jobs */}
              {pendingJobs.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium text-muted">
                    Active — {pendingJobs.length}
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingJobs.map((job) => {
                      const isAssigned = job.status === "assigned";
                      return (
                        <JobCard
                          key={job.legId}
                          job={job}
                          action={isAssigned ? "start" : "complete"}
                          actionLabel={
                            isAssigned ? "Start Work" : "Mark Complete"
                          }
                          onAction={isAssigned ? startAction : completeAction}
                          isPending={isAssigned ? startPending : completePending}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed jobs */}
              {completedJobs.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium text-muted">
                    Completed — {completedJobs.length}
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {completedJobs.map((job) => (
                      <Card key={job.legId} className="opacity-70">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                              <CardTitle className="text-base">
                                {job.productName}
                              </CardTitle>
                              <CardDescription>
                                ×{job.quantity} — KES {job.totalAmount}
                              </CardDescription>
                            </div>
                            <StatusBadge variant="success">
                              Complete
                            </StatusBadge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-1 text-sm text-muted">
                          <span>
                            Reward: KES {job.amount}
                          </span>
                          <span className="text-xs text-badge-warning-fg font-medium">
                            Payment pending — awaiting consumer confirmation
                          </span>
                          {job.completedAt && (
                            <span>
                              Completed:{" "}
                              {new Date(job.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
