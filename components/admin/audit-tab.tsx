"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getRecentAuditEvents, type AuditEntry } from "@/lib/admin/audit";

function EventBadge({ eventType }: { eventType: string }) {
  const colorMap: Record<string, string> = {
    "order.created": "bg-blue-100 text-blue-800",
    "leg.transitioned": "bg-purple-100 text-purple-800",
    "payment.initiated": "bg-yellow-100 text-yellow-800",
    "payment.completed": "bg-green-100 text-green-800",
    "payment.failed": "bg-red-100 text-red-800",
    "payment.ignored": "bg-gray-100 text-gray-800",
    "dispute.raised": "bg-orange-100 text-orange-800",
    "dispute.resolved": "bg-teal-100 text-teal-800",
    "admin.override": "bg-red-100 text-red-800",
    "admin.verify_user": "bg-indigo-100 text-indigo-800",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        colorMap[eventType] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {eventType.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export function AuditTab() {
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecentAuditEvents();
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted py-8 text-center">Loading audit events...</p>
        ) : events.length === 0 ? (
          <EmptyState
            title="No audit events yet"
            message="Audit events will appear here as actions are taken across the platform."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted">
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Actor</th>
                  <th className="px-4 py-2">Resource</th>
                  <th className="px-4 py-2">Resource ID</th>
                  <th className="px-4 py-2">Details</th>
                  <th className="px-4 py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <EventBadge eventType={event.eventType} />
                    </td>
                    <td className="px-4 py-3 text-sm">{event.actorName}</td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {event.resourceType.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {event.resourceId.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[200px] truncate">
                      {event.details ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {event.createdAt
                        ? new Date(event.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
