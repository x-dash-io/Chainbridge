"use client";

import { useState, useEffect, useCallback, useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getAdminDisputes,
  resolveDisputeAction,
  type AdminDispute,
} from "@/lib/admin/actions";

function ResolveForm({
  dispute,
  onClose,
}: {
  dispute: AdminDispute;
  onClose: () => void;
}) {
  const [resolution, setResolution] = useState<"override" | "refund_flagged">("override");
  const [notes, setNotes] = useState("");

  const resolveWithData = async (_prev: { error?: string; success?: boolean } | null, fd: FormData) => {
    fd.set("disputeId", dispute.id);
    fd.set("resolution", resolution);
    fd.set("notes", notes);
    const result = await resolveDisputeAction(null, fd);
    if (result?.success) onClose();
    return result;
  };

  const [state, formAction, pending] = useActionState(resolveWithData, null);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
      <h4 className="text-sm font-semibold">Resolve Dispute</h4>
      <p className="mt-1 text-xs text-muted">
        Leg: {dispute.legType.replace("_", " ")} &middot; Raised by:{" "}
        {dispute.raisedByName} &middot; Reason: {dispute.reason}
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-muted">Resolution type</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as "override" | "refund_flagged")}
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="override">Override leg status</option>
            <option value="refund_flagged">Flag for refund</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">
            Resolution notes <span className="text-destructive">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            rows={3}
            placeholder="Required — describe the resolution"
            required
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Resolving\u2026" : "Resolve"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
        {state?.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs text-success">Dispute resolved.</p>
        )}
      </form>
    </div>
  );
}

export function DisputesTab() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<AdminDispute | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminDisputes();
      setDisputes(data);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const statusVariant = (status: string) => {
    if (status === "open") return "error";
    if (status === "under_review") return "warning";
    return "neutral";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispute Queue</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted">Loading disputes...</p>
        ) : disputes.length === 0 ? (
          <EmptyState
            title="No disputes found"
            message="When issues are raised on order legs, they will appear here for resolution."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {disputes.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={statusVariant(d.status ?? "default")}>
                        {(d.status ?? "").replace("_", " ")}
                      </StatusBadge>
                      <span className="text-xs text-muted">
                        {d.createdAt
                          ? new Date(d.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {d.legType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} leg
                    </p>
                    <p className="text-sm text-muted">
                      Raised by: {d.raisedByName}
                    </p>
                    <p className="text-sm">{d.reason}</p>
                    {d.resolutionNotes && (
                      <p className="mt-1 text-xs text-muted">
                        Resolution: {d.resolutionNotes}
                      </p>
                    )}
                  </div>
                  {(d.status ?? "open") === "open" && (
                    <Button
                      size="sm"
                      onClick={() => setResolveTarget(d)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>

                {resolveTarget?.id === d.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    <ResolveForm
                      dispute={d}
                      onClose={() => {
                        setResolveTarget(null);
                        loadDisputes();
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
