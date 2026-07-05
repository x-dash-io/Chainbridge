"use client";

import { useActionState, useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderLegTracker, type OrderLeg } from "@/components/order-leg-tracker";
import { startLeg, completeLeg, type ProductActionState } from "@/app/(dashboard)/producer/actions";

type IncomingOrder = {
  orderId: string;
  productName: string;
  consumerName: string;
  quantity: number;
  totalAmount: string;
  rawSupplyLeg: {
    id: string;
    status: string;
    amount: string;
    assignedAt: string | null;
  };
  legs: OrderLeg[];
};

type IncomingOrdersProps = {
  orders: IncomingOrder[];
};

const initialState: ProductActionState = null;

function OrderCard({ order }: { order: IncomingOrder }) {
  const [legStatus, setLegStatus] = useState(order.rawSupplyLeg.status);

  useEffect(() => {
    setLegStatus(order.rawSupplyLeg.status);
  }, [order.rawSupplyLeg.status]);

  const [startState, startAction, startPending] = useActionState(
    startLeg,
    initialState,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeLeg,
    initialState,
  );

  useEffect(() => {
    if (startState?.success) setLegStatus("in_progress");
  }, [startState]);

  useEffect(() => {
    if (completeState?.success) setLegStatus("completed");
  }, [completeState]);

  const legStatusVariant: "success" | "warning" | "neutral" =
    legStatus === "completed" || legStatus === "paid"
      ? "success"
      : legStatus === "in_progress"
        ? "warning"
        : "neutral";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{order.productName}</CardTitle>
            <CardDescription>
              Ordered by {order.consumerName} &middot; Qty: {order.quantity}
            </CardDescription>
          </div>
          <StatusBadge variant={legStatusVariant}>
            {legStatus.replace("_", " ")}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <OrderLegTracker legs={order.legs} />

        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-sm">
          <span className="text-muted">
            Leg amount:{" "}
            <span className="font-medium text-foreground">
              KES {order.rawSupplyLeg.amount}
            </span>
          </span>
          <span className="text-muted">
            Order total:{" "}
            <span className="font-medium text-foreground">
              KES {order.totalAmount}
            </span>
          </span>
          {order.rawSupplyLeg.assignedAt && (
            <span className="text-muted">
              Assigned:{" "}
              <span className="text-foreground">
                {new Date(order.rawSupplyLeg.assignedAt).toLocaleDateString()}
              </span>
            </span>
          )}
        </div>

        {startState?.error && (
          <p className="text-xs text-destructive">{startState.error}</p>
        )}
        {completeState?.error && (
          <p className="text-xs text-destructive">{completeState.error}</p>
        )}

        {(legStatus === "pending" || legStatus === "assigned") && (
          <form action={startAction} className="flex w-full sm:w-auto">
            <input type="hidden" name="legId" value={order.rawSupplyLeg.id} />
            <Button type="submit" variant="accent" disabled={startPending} className="w-full cursor-pointer sm:w-auto">
              {startPending ? "Starting…" : "Start Fulfilling"}
            </Button>
          </form>
        )}

        {legStatus === "in_progress" && (
          <form action={completeAction} className="flex w-full sm:w-auto">
            <input type="hidden" name="legId" value={order.rawSupplyLeg.id} />
            <Button type="submit" variant="primary" disabled={completePending} className="w-full cursor-pointer sm:w-auto">
              {completePending ? "Completing\u2026" : "Mark Complete"}
            </Button>
          </form>
        )}

        {(legStatus === "completed" || legStatus === "paid") && (
          <p className="text-xs text-success">Fulfilled</p>
        )}
      </CardContent>
    </Card>
  );
}

export function IncomingOrders({ orders }: IncomingOrdersProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title="No incoming orders yet"
        message="When a consumer places an order for your product, it will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <OrderCard key={order.orderId} order={order} />
      ))}
    </div>
  );
}
