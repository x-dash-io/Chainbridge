"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminReports, type ReportData } from "@/lib/admin/actions";

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ReportsTab() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminReports();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted py-8 text-center">Loading reports...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No report data available"
        message="Report data will appear here once there is platform activity."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        Note: These numbers are computed from the database in real time.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Value Transacted"
          value={`KES ${data.totalValueTransacted}`}
        />
        <MetricCard
          title="Daily Orders"
          value={String(
            data.orderVolume.length > 0
              ? data.orderVolume[data.orderVolume.length - 1].count
              : 0,
          )}
        />
        <MetricCard
          title="Total Orders"
          value={String(
            data.orderVolume.reduce((sum, d) => sum + d.count, 0),
          )}
        />
        <MetricCard
          title="Active Roles"
          value={String(data.activeUsersPerRole.length)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {data.orderVolume.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.orderVolume.map((d) => (
                  <div
                    key={d.date}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-24 shrink-0 text-muted">{d.date}</span>
                    <div className="flex h-5 flex-1 items-center">
                      <div
                        className="h-full rounded bg-primary transition-all"
                        style={{
                          width: `${Math.min(
                            (d.count /
                              Math.max(
                                ...data.orderVolume.map((x) => x.count),
                              )) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users Per Role</CardTitle>
          </CardHeader>
          <CardContent>
            {data.activeUsersPerRole.length === 0 ? (
              <p className="text-sm text-muted">No users registered.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.activeUsersPerRole.map((r) => (
                  <div
                    key={r.role}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-32 shrink-0 text-muted">
                      {r.role.replace("_", " ")}
                    </span>
                    <div className="flex h-5 flex-1 items-center">
                      <div
                        className="h-full rounded bg-accent transition-all"
                        style={{
                          width: `${Math.min(
                            (r.count /
                              Math.max(
                                ...data.activeUsersPerRole.map((x) => x.count),
                              )) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Time-to-Completion Per Leg Type</CardTitle>
          </CardHeader>
          <CardContent>
            {data.avgTimeToCompletion.length === 0 ? (
              <p className="text-sm text-muted">No completed legs yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.avgTimeToCompletion.map((l) => (
                  <div
                    key={l.legType}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-32 shrink-0 text-muted">
                      {l.legType.replace("_", " ")}
                    </span>
                    <span className="font-medium">
                      {l.avgHours !== null
                        ? `${l.avgHours} hrs`
                        : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
