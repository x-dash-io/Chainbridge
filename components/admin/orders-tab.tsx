"use client";

import { useState, useEffect, useCallback, useActionState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderLegTracker } from "@/components/order-leg-tracker";
import {
  getAdminOrders,
  searchOrders,
  getOrderLegs,
  overrideLegAction,
  type AdminOrder,
  type LegDetail,
} from "@/lib/admin/actions";

function OverrideLegForm({
  leg,
  onClose,
}: {
  leg: { id: string; legType: string; status: string | null };
  onClose: () => void;
}) {
  const [toStatus, setToStatus] = useState("completed");
  const [reason, setReason] = useState("");

  const overrideWithData = async (_prev: { error?: string; success?: boolean } | null, fd: FormData) => {
    fd.set("legId", leg.id);
    fd.set("toStatus", toStatus);
    fd.set("reason", reason);
    const result = await overrideLegAction(null, fd);
    if (result?.success) onClose();
    return result;
  };

  const [state, formAction, pending] = useActionState(overrideWithData, null);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
      <h4 className="text-sm font-semibold">
        Override {leg.legType.replace("_", " ")} leg
      </h4>
      <p className="mt-1 text-xs text-muted">
        Current status: <StatusBadge status={leg.status ?? "pending"} />
      </p>
      <form
        action={formAction}
        className="mt-3 flex flex-col gap-3"
      >
        <div>
          <label className="text-xs font-medium text-muted">New status</label>
          <select
            value={toStatus}
            onChange={(e) => setToStatus(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            rows={2}
            placeholder="Required — this is written to the audit trail"
            required
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" variant="destructive" disabled={pending}>
            {pending ? "Overriding\u2026" : "Override Leg"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
        {state?.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs text-success">Leg overridden successfully.</p>
        )}
      </form>
    </div>
  );
}

function OrderDetailView({
  order,
  onBack,
}: {
  order: AdminOrder;
  onBack: () => void;
}) {
  const [legs, setLegs] = useState<LegDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideLeg, setOverrideLeg] = useState<{ id: string; legType: string; status: string | null } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadLegs = useCallback(() => {
    setLoading(true);
    getOrderLegs(order.id)
      .then(setLegs)
      .catch(() => setLegs([]))
      .finally(() => setLoading(false));
  }, [order.id]);

  useEffect(() => {
    loadLegs();
  }, [loadLegs, refreshKey]);

  const trackerLegs = legs.map((l) => ({
    id: l.id,
    roleLabel: l.legType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    status: (l.status === "paid" ? "completed" : l.status ?? "pending") as "pending" | "in_progress" | "completed" | "cancelled",
    amount: `KES ${l.amount}`,
    timestamp: l.assignedAt ? new Date(l.assignedAt).toLocaleDateString() : undefined,
    assignee: l.assignedUserName ?? undefined,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Back
        </Button>
        <h3 className="text-lg font-semibold">
          Order {order.id.slice(0, 8)}...
        </h3>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted">Consumer:</span>{" "}
          <span className="font-medium">{order.consumerName}</span>
        </div>
        <div>
          <span className="text-muted">Product:</span>{" "}
          <span className="font-medium">{order.productName}</span>
        </div>
        <div>
          <span className="text-muted">Total:</span>{" "}
          <span className="font-medium">KES {order.totalAmount}</span>
        </div>
        <div>
          <span className="text-muted">Quantity:</span>{" "}
          <span className="font-medium">{order.quantity}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leg Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted">Loading legs...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <OrderLegTracker legs={trackerLegs} isAdmin />

              <div className="border-t border-border pt-4">
                <h4 className="mb-2 text-sm font-semibold">Leg Details</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted">
                      <th className="px-2 py-1">Type</th>
                      <th className="px-2 py-1">Assigned To</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">Amount</th>
                      <th className="px-2 py-1">Assigned At</th>
                      <th className="px-2 py-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legs.map((l) => (
                      <tr key={l.id} className="border-b border-border">
                        <td className="px-2 py-2 font-medium">
                          {l.legType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </td>
                        <td className="px-2 py-2 text-muted">
                          {l.assignedUserName ?? "Unassigned"}
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge status={l.status ?? "pending"} />
                        </td>
                        <td className="px-2 py-2">KES {l.amount}</td>
                        <td className="px-2 py-2 text-muted">
                          {l.assignedAt
                            ? new Date(l.assignedAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setOverrideLeg({
                                id: l.id,
                                legType: l.legType,
                                status: l.status,
                              })
                            }
                          >
                            Override
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {overrideLeg && (
                <OverrideLegForm
                  leg={overrideLeg}
                  onClose={() => {
                    setOverrideLeg(null);
                    setRefreshKey((k) => k + 1);
                  }}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = search ? await searchOrders(search) : await getAdminOrders();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (selectedOrder) {
    return (
      <OrderDetailView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Orders</CardTitle>
          <Input
            placeholder="Search by order ID, consumer, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted">Loading orders...</p>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            message={search ? "Try a different search term." : "Orders will appear here when consumers place them."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted">
                  <th className="px-4 py-2">Order ID</th>
                  <th className="px-4 py-2">Consumer</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">{order.consumerName}</td>
                    <td className="px-4 py-3 text-sm">{order.productName}</td>
                    <td className="px-4 py-3 text-sm">{order.quantity}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      KES {order.totalAmount}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Legs
                      </Button>
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
