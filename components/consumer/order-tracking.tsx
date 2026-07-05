"use client";

import { useActionState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderLegTracker } from "@/components/order-leg-tracker";
import { confirmReceiptAction, cancelOrderAction } from "@/lib/orders/actions";

type OrderLeg = {
  id: string;
  roleLabel: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  isPaid?: boolean;
  amount: string;
  timestamp?: string;
  assignee?: string;
};

type ConsumerOrder = {
  orderId: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  createdAt: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  legs: OrderLeg[];
};

type Props = {
  orders: ConsumerOrder[];
};

const overallBadgeVariant: Record<
  string,
  "neutral" | "success" | "warning" | "error"
> = {
  pending: "neutral",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

function OrderCard({ order }: { order: ConsumerOrder }) {
  const confirmableLegs = order.legs.filter(
    (l) => l.status === "completed" && !l.isPaid,
  );

  const cancellable =
    order.status === "pending" &&
    order.legs.every(
      (l) => l.status === "pending" || l.status === "assigned",
    );

  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelOrderAction,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">
              {order.productName}
            </CardTitle>
            <CardDescription>
              ×{order.quantity} — KES {order.totalAmount}
            </CardDescription>
          </div>
          <StatusBadge variant={overallBadgeVariant[order.status]}>
            {order.status.replace("_", " ")}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <OrderLegTracker legs={order.legs} />

        {confirmableLegs.length > 0 && (
          <div className="flex flex-col gap-2">
            {confirmableLegs.map((leg) => (
              <LegConfirmRow key={leg.id} leg={leg} />
            ))}
          </div>
        )}

        {cancellable && (
          <form action={cancelAction} onSubmit={(e) => {
            if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
              e.preventDefault();
            }
          }}>
            <input type="hidden" name="orderId" value={order.orderId} />
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={cancelPending}
              className="w-full cursor-pointer"
            >
              {cancelPending ? "Cancelling\u2026" : "Cancel Order"}
            </Button>
            {cancelState?.error && (
              <p className="mt-1 text-xs text-destructive">{cancelState.error}</p>
            )}
          </form>
        )}

        <div className="text-xs text-muted border-t border-border/40 pt-3">
          {order.createdAt && (
            <span>Ordered {new Date(order.createdAt).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LegConfirmRow({ leg }: { leg: OrderLeg }) {
  const [state, action, pending] = useActionState(confirmReceiptAction, null);

  if (leg.status === "completed" && !leg.isPaid) {
    return (
      <form action={action} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-border/60 bg-background/30 p-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {leg.roleLabel}
          </span>
          <span className="text-xs text-muted">{leg.amount}</span>
          {state?.error && (
            <span className="mt-1 text-xs text-destructive">{state.error}</span>
          )}
        </div>
        <input type="hidden" name="legId" value={leg.id} />
        <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto cursor-pointer">
          {pending ? "Confirming\u2026" : "Confirm & Release"}
        </Button>
      </form>
    );
  }

  return null;
}

export function OrderTracking({ orders }: Props) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="Browse products and place your first order."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight">Your Orders</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <OrderCard key={order.orderId} order={order} />
        ))}
      </div>
    </div>
  );
}
