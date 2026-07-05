import { db as defaultDb } from "@/db/client";
import { orders, orderLegs, payments, payouts, products } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

export type CancelOrderInput = {
  orderId: string;
  actorUserId: string;
};

export type CancelOrderResult = {
  orderId: string;
  cancelled: boolean;
  reason?: string;
};

const CANCELLABLE_LEG_STATUSES = ["pending", "assigned"] as const;

export async function cancelOrder(
  input: CancelOrderInput,
  db: DbInstance = defaultDb,
): Promise<CancelOrderResult> {
  const { orderId, actorUserId } = input;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.consumerId !== actorUserId) {
    throw new Error("Only the order owner can cancel this order");
  }

  const allLegs = await db
    .select()
    .from(orderLegs)
    .where(eq(orderLegs.orderId, orderId));

  if (allLegs.length === 0) {
    throw new Error(`Order ${orderId} has no legs`);
  }

  const nonCancellableLegs = allLegs.filter(
    (leg) =>
      leg.status !== "pending" &&
      leg.status !== "assigned" &&
      leg.status !== "cancelled",
  );

  if (nonCancellableLegs.length > 0) {
    const startedTypes = nonCancellableLegs
      .map((l) => `${l.legType} (${l.status})`)
      .join(", ");
    throw new Error(
      `Cannot cancel order — legs have already started or been completed: ${startedTypes}`,
    );
  }

  const cancellableLegIds = allLegs
    .filter((leg) => leg.status === "pending" || leg.status === "assigned")
    .map((leg) => leg.id);

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId));

  await db.transaction(async (tx: DbInstance) => {
    if (cancellableLegIds.length > 0) {
      await tx
        .update(orderLegs)
        .set({ status: "cancelled" })
        .where(inArray(orderLegs.id, cancellableLegIds));
    }

    const existingPayouts = await tx
      .select()
      .from(payouts)
      .where(inArray(payouts.orderLegId, cancellableLegIds));

    const owedPayoutIds = existingPayouts
      .filter((p) => p.status === "owed")
      .map((p) => p.id);

    if (owedPayoutIds.length > 0) {
      await tx
        .delete(payouts)
        .where(inArray(payouts.id, owedPayoutIds));
    }

    if (payment) {
      await tx
        .update(payments)
        .set({ status: "cancelled" })
        .where(eq(payments.id, payment.id));
    }

    await tx
      .update(products)
      .set({
        quantityAvailable: sql`${products.quantityAvailable} + ${order.quantity}`,
      })
      .where(eq(products.id, order.productId));
  });

  return { orderId, cancelled: true };
}
