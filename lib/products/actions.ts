"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { products, orders, orderLegs, users, payments } from "@/db/schema";
import { eq, inArray, sum, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { requireRetailer } from "@/lib/auth/authorization";
import { createResaleListing } from "./create-resale-listing";
import { revalidatePath } from "next/cache";

const CreateResaleListingSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.string().min(1, "Category is required").max(100),
  unit: z.string().min(1, "Unit is required").max(50),
  pricePerUnit: z.coerce.number().positive("Price must be positive"),
  quantityAvailable: z.coerce.number().int().positive("Quantity must be positive"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  imagePublicId: z.string().optional(),
  sourceOrderId: z.string().uuid().optional().or(z.literal("")),
});

export type CreateResaleListingState = {
  error?: string;
  success?: boolean;
  productId?: string;
} | null;

export async function createResaleListingAction(
  _prevState: CreateResaleListingState,
  formData: FormData,
): Promise<CreateResaleListingState> {
  try {
    const user = await getUser();
    requireRetailer(user);

    const rawExternallySourced = formData.get("externallySourced");
    const externallySourced = rawExternallySourced === "true" || rawExternallySourced === "on";

    const parsed = CreateResaleListingSchema.safeParse({
      name: formData.get("name"),
      category: formData.get("category"),
      unit: formData.get("unit"),
      pricePerUnit: formData.get("pricePerUnit"),
      quantityAvailable: formData.get("quantityAvailable"),
      description: formData.get("description") || undefined,
      imageUrl: formData.get("imageUrl") || undefined,
      imagePublicId: formData.get("imagePublicId") || undefined,
      sourceOrderId: formData.get("sourceOrderId") || undefined,
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return { error: `Invalid input: ${errorMsg}` };
    }

    const result = await createResaleListing({
      retailerId: user.id,
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      pricePerUnit: parsed.data.pricePerUnit,
      quantityAvailable: parsed.data.quantityAvailable,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      imagePublicId: parsed.data.imagePublicId,
      sourceOrderId: parsed.data.sourceOrderId || undefined,
      externallySourced,
    });

    revalidatePath("/retailer");
    return { success: true, productId: result.productId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create resale listing." };
  }
}

export async function getRetailerSourcingOrders() {
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

  const assigneeIds = [
    ...new Set(legRows.map((l) => l.assignedUserId).filter(Boolean)),
  ];
  const assigneeRows =
    assigneeIds.length > 0
      ? await db
          .select()
          .from(users)
          .where(inArray(users.id, assigneeIds as string[]))
      : [];
  const assigneeMap = new Map(assigneeRows.map((a) => [a.id, a.name]));

  // Check if each order has already been listed for resale
  const resaleListings = await db
    .select({ sourceOrderId: products.sourceOrderId })
    .from(products)
    .where(
      and(
        eq(products.sellerId, user.id),
        eq(products.sellerRole, "retailer"),
        sql`${products.sourceOrderId} IS NOT NULL`,
      ),
    );
  const listedOrderIds = new Set(
    resaleListings.map((r) => r.sourceOrderId).filter(Boolean) as string[],
  );

  return orderRows.map((order) => {
    const orderLegsList = legsByOrder.get(order.id) ?? [];
    const statuses = orderLegsList.map((l) => l.status);
    const allCancelled = statuses.every((s) => s === "cancelled");
    const nonCancelled = statuses.filter((s) => s !== "cancelled");
    const allPaid = nonCancelled.length > 0 && nonCancelled.every((s) => s === "paid");
    const allPending = nonCancelled.every((s) => s === "pending" || s === null);
    const overall = allCancelled ? "cancelled" : allPaid ? "completed" : allPending ? "pending" : "in_progress";

    const isFullyCompleted =
      orderLegsList.length > 0 &&
      orderLegsList.every((l) => l.status === "completed" || l.status === "paid");

    return {
      orderId: order.id,
      productName: productMap.get(order.productId) ?? "Unknown Product",
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt?.toISOString() ?? "",
      status: overall as "pending" | "in_progress" | "completed" | "cancelled",
      isFullyCompleted,
      isAlreadyListed: listedOrderIds.has(order.id),
      legs: orderLegsList.map((l) => ({
        id: l.id,
        roleLabel: l.legType
          .replace("_", " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        status: (l.status === "paid" ? "completed" : l.status ?? "pending") as
          | "pending"
          | "in_progress"
          | "completed"
          | "cancelled",
        isPaid: l.status === "paid",
        amount: `KES ${l.amount}`,
        timestamp: l.assignedAt?.toLocaleDateString() ?? undefined,
        assignee: l.assignedUserId ? assigneeMap.get(l.assignedUserId) : undefined,
      })),
    };
  });
}

export async function getRetailerResaleListings() {
  const user = await getUser();

  // 1. Get all resale products for the retailer
  const resaleProducts = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      unit: products.unit,
      pricePerUnit: products.pricePerUnit,
      quantityAvailable: products.quantityAvailable,
      status: products.status,
      externallySourced: products.externallySourced,
      sourceOrderId: products.sourceOrderId,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(
      and(
        eq(products.sellerId, user.id),
        eq(products.sellerRole, "retailer"),
      ),
    )
    .orderBy(products.createdAt);

  if (resaleProducts.length === 0) return [];

  // 2. Fetch the source orders details (cost)
  const sourceOrderIds = resaleProducts
    .map((p) => p.sourceOrderId)
    .filter(Boolean) as string[];

  const sourceOrdersMap = new Map<string, string>();
  if (sourceOrderIds.length > 0) {
    const sourceOrders = await db
      .select({ id: orders.id, totalAmount: orders.totalAmount })
      .from(orders)
      .where(inArray(orders.id, sourceOrderIds));
    for (const o of sourceOrders) {
      sourceOrdersMap.set(o.id, o.totalAmount);
    }
  }

  // 3. Fetch sales of these products (revenue)
  // Each sale is an order placed for this product. The retailer receives KES quantity * pricePerUnit.
  // Only count sales where payment has been confirmed.
  const productIds = resaleProducts.map((p) => p.id);
  const sales = await db
    .select({
      productId: orders.productId,
      quantity: orders.quantity,
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        inArray(orders.productId, productIds),
        eq(payments.status, "completed"),
      ),
    );

  const salesMap = new Map<string, number>();
  for (const s of sales) {
    const current = salesMap.get(s.productId) ?? 0;
    salesMap.set(s.productId, current + s.quantity);
  }

  return resaleProducts.map((product) => {
    const costAmount = product.sourceOrderId
      ? parseFloat(sourceOrdersMap.get(product.sourceOrderId) ?? "0")
      : 0;

    const unitsSold = salesMap.get(product.id) ?? 0;
    const revenueAmount = unitsSold * parseFloat(product.pricePerUnit);

    const marginAmount = product.externallySourced
      ? null
      : revenueAmount - costAmount;

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      pricePerUnit: product.pricePerUnit,
      quantityAvailable: product.quantityAvailable,
      status: product.status,
      externallySourced: product.externallySourced,
      sourceOrderId: product.sourceOrderId,
      createdAt: product.createdAt?.toISOString() ?? "",
      cost: product.externallySourced ? "N/A (External)" : `KES ${costAmount.toFixed(2)}`,
      revenue: `KES ${revenueAmount.toFixed(2)}`,
      margin: product.externallySourced
        ? "N/A (External)"
        : `KES ${marginAmount!.toFixed(2)}`,
      marginRaw: marginAmount,
    };
  });
}
