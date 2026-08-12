"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { orderLegs, orders, products, users, payments, payouts } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { requireConsumerOrRetailer, requireRetailer } from "@/lib/auth/authorization";
import { createOrder } from "@/lib/orders/create-order";
import { cancelOrder } from "@/lib/orders/cancel-order";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { revalidatePath } from "next/cache";

const CreateOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  processorId: z.string().uuid().optional(),
  processorAmount: z.coerce.number().positive().optional(),
  packerId: z.string().uuid().optional(),
  packerAmount: z.coerce.number().positive().optional(),
  agentId: z.string().uuid().optional(),
  agentAmount: z.coerce.number().positive().optional(),
});

export type CreateOrderState = {
  error?: string;
  orderId?: string;
  totalAmount?: string;
} | null;

export async function createOrderAction(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  try {
    const user = await getUser();
    requireConsumerOrRetailer(user);

    const parsed = CreateOrderSchema.safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
      processorId: formData.get("processorId") || undefined,
      processorAmount: formData.get("processorAmount") || undefined,
      packerId: formData.get("packerId") || undefined,
      packerAmount: formData.get("packerAmount") || undefined,
      agentId: formData.get("agentId") || undefined,
      agentAmount: formData.get("agentAmount") || undefined,
    });

    if (!parsed.success) {
      return { error: "Invalid input. Please check your selections." };
    }

    const legs: {
      processing?: { processorId: string; amount: number };
      packing?: { packerId: string; amount: number };
      delivery?: { agentId: string; amount: number };
    } = {};

    if (parsed.data.processorId && parsed.data.processorAmount) {
      legs.processing = {
        processorId: parsed.data.processorId,
        amount: parsed.data.processorAmount,
      };
    }
    if (parsed.data.packerId && parsed.data.packerAmount) {
      legs.packing = {
        packerId: parsed.data.packerId,
        amount: parsed.data.packerAmount,
      };
    }
    if (parsed.data.agentId && parsed.data.agentAmount) {
      legs.delivery = {
        agentId: parsed.data.agentId,
        amount: parsed.data.agentAmount,
      };
    }

    const result = await createOrder({
      consumerId: user.id,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      legs,
    });

    revalidatePath("/consumer");
    revalidatePath("/retailer");
    return { orderId: result.orderId, totalAmount: result.totalAmount };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create order." };
  }
}

export async function getProductsForConsumer() {
  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      unit: products.unit,
      pricePerUnit: products.pricePerUnit,
      quantityAvailable: products.quantityAvailable,
      sellerId: products.sellerId,
      sellerName: users.name,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .innerJoin(users, eq(products.sellerId, users.id))
    .where(eq(products.status, "active"));

  return productRows;
}

export async function getAvailableServiceProviders() {
  const roleMap = ["processor", "packer", "delivery_agent"] as const;
  const rows = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(inArray(users.role, roleMap));

  return {
    processors: rows.filter((r) => r.role === "processor"),
    packers: rows.filter((r) => r.role === "packer"),
    agents: rows.filter((r) => r.role === "delivery_agent"),
  };
}

export async function getConsumerOrders() {
  const user = await getUser();

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.consumerId, user.id))
    .orderBy(orders.createdAt);

  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((o) => o.id);

  const legRows = await db
    .select()
    .from(orderLegs)
    .where(inArray(orderLegs.orderId, orderIds));

  const legsByOrder = new Map<string, typeof legRows>();
  for (const leg of legRows) {
    const existing = legsByOrder.get(leg.orderId) ?? [];
    existing.push(leg);
    legsByOrder.set(leg.orderId, existing);
  }

  const productIds = [...new Set(orderRows.map((o) => o.productId))];
  const productRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));
  const productMap = new Map(productRows.map((p) => [p.id, p.name]));

  return orderRows.map((order) => {
    const orderLegsList = legsByOrder.get(order.id) ?? [];
    const status = computeOrderStatusSync(orderLegsList);
    return {
      orderId: order.id,
      productName: productMap.get(order.productId) ?? "Unknown Product",
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt?.toISOString() ?? "",
      status,
      legs: orderLegsList.map((l) => ({
        id: l.id,
        roleLabel: l.legType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        status: l.status as "pending" | "assigned" | "in_progress" | "completed" | "cancelled" | "paid",
        amount: `KES ${l.amount}`,
        timestamp: l.assignedAt?.toLocaleDateString() ?? undefined,
        assignee: undefined,
      })),
    };
  });
}

export async function confirmReceiptAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean } | null> {
  try {
    const user = await getUser();
    requireConsumerOrRetailer(user);

    const legId = formData.get("legId");
    if (typeof legId !== "string") return { error: "Invalid leg." };

    const [leg] = await db
      .select()
      .from(orderLegs)
      .where(eq(orderLegs.id, legId));

    if (!leg) return { error: "Leg not found." };

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, leg.orderId));

    if (!order || order.consumerId !== user.id) {
      return { error: "This is not your order." };
    }

    if (leg.status !== "completed") {
      return { error: "Leg must be completed before confirming receipt." };
    }

    await db
      .update(orderLegs)
      .set({ status: "paid" })
      .where(eq(orderLegs.id, legId));

    const [existingPayout] = await db
      .select()
      .from(payouts)
      .where(eq(payouts.orderLegId, legId))
      .limit(1);

    if (existingPayout) {
      await db
        .update(payouts)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(payouts.orderLegId, legId));
    } else {
      await db.insert(payouts).values({
        orderLegId: legId,
        userId: leg.assignedUserId!,
        amount: leg.amount,
        status: "paid",
        paidAt: new Date(),
      });
    }

    await recordAuditEvent({
      eventType: "payout.paid",
      actorId: user.id,
      resourceType: "leg",
      resourceId: legId,
      details: {
        legType: leg.legType,
        amount: leg.amount,
        payoutStatus: "paid",
      },
    });

    revalidatePath("/consumer");
    revalidatePath("/retailer");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to confirm receipt.",
    };
  }
}

export async function cancelOrderAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean } | null> {
  try {
    const user = await getUser();
    requireConsumerOrRetailer(user);

    const orderId = formData.get("orderId");
    if (typeof orderId !== "string") return { error: "Invalid order." };

    await cancelOrder({ orderId, actorUserId: user.id });

    revalidatePath("/consumer");
    revalidatePath("/retailer");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to cancel order.",
    };
  }
}

export type ForcePaymentState = {
  error?: string;
  success?: boolean;
} | null;

export async function forceCompletePayment(
  _prevState: ForcePaymentState,
  formData: FormData,
): Promise<ForcePaymentState> {
  try {
    const user = await getUser();
    requireConsumerOrRetailer(user);

    const orderId = formData.get("orderId");
    if (typeof orderId !== "string") return { error: "Invalid order." };

    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, "initiated")))
      .limit(1);

    if (!payment) return { error: "No initiated payment found for this order." };

    const allLegs = await db
      .select()
      .from(orderLegs)
      .where(eq(orderLegs.orderId, orderId));

    if (allLegs.length === 0) return { error: "Order has no legs." };

    const receipt = `MANUAL-${Date.now().toString(36).toUpperCase()}`;

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({ status: "completed", mpesaReceipt: receipt })
        .where(eq(payments.id, payment.id));

      const nonCancelledLegs = allLegs.filter((l) => l.status !== "cancelled");

      for (const leg of nonCancelledLegs) {
        if (!leg.assignedUserId) continue;

        const [existingPayout] = await tx
          .select()
          .from(payouts)
          .where(
            and(
              eq(payouts.orderLegId, leg.id),
              eq(payouts.userId, leg.assignedUserId),
            ),
          )
          .limit(1);

        if (existingPayout) continue;

        await tx.insert(payouts).values({
          orderLegId: leg.id,
          userId: leg.assignedUserId,
          amount: leg.amount,
          status: "owed",
        });
      }
    });

    await recordAuditEvent({
      eventType: "payment.completed",
      actorId: user.id,
      resourceType: "payment",
      resourceId: payment.id,
      details: {
        orderId,
        mpesaReceipt: receipt,
        amount: payment.amount,
        reason: "manual_force_complete",
      },
    });

    revalidatePath("/consumer");
    revalidatePath("/retailer");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to complete payment.",
    };
  }
}

function computeOrderStatusSync(
  legRows: Array<{ status: string | null }>,
): "pending" | "in_progress" | "completed" | "cancelled" {
  if (legRows.length === 0) return "pending";
  const statuses = legRows.map((l) => l.status);
  const allCancelled = statuses.every((s) => s === "cancelled");
  const nonCancelled = statuses.filter((s) => s !== "cancelled");
  const allPaid = nonCancelled.length > 0 && nonCancelled.every((s) => s === "paid");
  const allPending = nonCancelled.every((s) => s === "pending" || s === null);
  if (allCancelled) return "cancelled";
  if (allPaid) return "completed";
  if (allPending) return "pending";
  return "in_progress";
}