"use client";

import { useState, useActionState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderLegTracker } from "@/components/order-leg-tracker";
import { confirmReceiptAction, cancelOrderAction, forceCompletePayment } from "@/lib/orders/actions";

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
  isPaid?: boolean;
  paymentStatus?: string | null;
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
  const [retryPhone, setRetryPhone] = useState("");
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);

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
  const [payState, payAction, payPending] = useActionState(forceCompletePayment, null);

  const handleRetryPayment = async () => {
    if (!retryPhone.match(/^2547\d{8}$/)) {
      setRetryError("Enter a valid M-Pesa number (2547XXXXXXXX)");
      return;
    }
    setRetryPending(true);
    setRetryError(null);
    try {
      const res = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, phoneNumber: retryPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRetryError(data.error ?? "Payment failed. Try again.");
        return;
      }
      alert("STK push sent! Check your phone and enter your PIN.");
    } catch {
      setRetryError("Network error. Please try again.");
    } finally {
      setRetryPending(false);
    }
  };

  const isPaymentFailed = order.paymentStatus === "failed";

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
          <div className="flex items-center gap-2">
            {isPaymentFailed && (
              <StatusBadge variant="error">PAYMENT FAILED</StatusBadge>
            )}
            {order.isPaid && !isPaymentFailed && (
              <StatusBadge variant="success">PAID</StatusBadge>
            )}
            <StatusBadge variant={overallBadgeVariant[order.status]}>
              {order.status.replace("_", " ")}
            </StatusBadge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <OrderLegTracker legs={order.legs} />

        {isPaymentFailed && (
          <div className="rounded-lg border border-badge-error-fg/20 bg-badge-error-bg/10 p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-badge-error-fg">
              Payment failed. Check your M-Pesa and try again.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="retry-phone" className="text-xs text-muted">
                M-Pesa Phone Number
              </Label>
              <Input
                id="retry-phone"
                type="tel"
                placeholder="2547XXXXXXXX"
                value={retryPhone}
                onChange={(e) => setRetryPhone(e.target.value)}
                className="bg-background text-sm"
              />
              {retryError && (
                <p className="text-xs text-destructive">{retryError}</p>
              )}
              <Button
                type="button"
                variant="primary"
                disabled={retryPending}
                onClick={handleRetryPayment}
                className="cursor-pointer"
              >
                {retryPending ? "Sending\u2026" : "Retry Payment"}
              </Button>
            </div>
          </div>
        )}

        {confirmableLegs.length > 0 && (
          <div className="flex flex-col gap-2">
            {confirmableLegs.map((leg) => (
              <LegConfirmRow key={leg.id} leg={leg} />
            ))}
          </div>
        )}

        {payState?.error && (
          <p className="text-xs text-destructive">{payState.error}</p>
        )}

        {payState?.success && (
          <p className="text-xs text-success font-medium">Payment confirmed!</p>
        )}

        {!order.isPaid && !isPaymentFailed && !payState?.success && order.status !== "cancelled" && (
          <form action={payAction}>
            <input type="hidden" name="orderId" value={order.orderId} />
            <Button type="submit" variant="accent" disabled={payPending} className="w-full cursor-pointer">
              {payPending ? "Processing\u2026" : "Mark as Paid"}
            </Button>
          </form>
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
