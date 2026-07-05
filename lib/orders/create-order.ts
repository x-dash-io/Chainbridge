import { db as defaultDb } from "@/db/client";
import { orders, orderLegs, products } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

export type CreateOrderInput = {
  consumerId: string;
  productId: string;
  quantity: number;
  legs: {
    processing?: { processorId: string; amount: number };
    packing?: { packerId: string; amount: number };
    delivery?: { agentId: string; amount: number };
  };
};

export type CreateOrderResult = {
  orderId: string;
  totalAmount: string;
};

export async function createOrder(
  input: CreateOrderInput,
  db: DbInstance = defaultDb,
): Promise<CreateOrderResult> {
  const { consumerId, productId, quantity, legs: optionalLegs } = input;

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  if (quantity > product.quantityAvailable) {
    throw new Error(
      `Requested quantity ${quantity} exceeds available ${product.quantityAvailable}`,
    );
  }

  const productAmount =
    parseFloat(product.pricePerUnit) * quantity;

  const legAmounts: Array<{
    legType: "processing" | "packing" | "delivery";
    assignedUserId: string;
    amount: number;
  }> = [];

  if (optionalLegs.processing) {
    legAmounts.push({
      legType: "processing",
      assignedUserId: optionalLegs.processing.processorId,
      amount: optionalLegs.processing.amount,
    });
  }
  if (optionalLegs.packing) {
    legAmounts.push({
      legType: "packing",
      assignedUserId: optionalLegs.packing.packerId,
      amount: optionalLegs.packing.amount,
    });
  }
  if (optionalLegs.delivery) {
    legAmounts.push({
      legType: "delivery",
      assignedUserId: optionalLegs.delivery.agentId,
      amount: optionalLegs.delivery.amount,
    });
  }

  const totalLegAmount = legAmounts.reduce((sum, l) => sum + l.amount, 0);
  const totalAmount = (productAmount + totalLegAmount).toFixed(2);

  const result = await db.transaction(async (tx: DbInstance) => {
    const [updatedProduct] = await tx
      .update(products)
      .set({
        quantityAvailable: sql`${products.quantityAvailable} - ${quantity}`,
      })
      .where(
        and(
          eq(products.id, productId),
          sql`${products.quantityAvailable} >= ${quantity}`,
        ),
      )
      .returning({ id: products.id });

    if (!updatedProduct) {
      throw new Error(
        `Requested quantity ${quantity} exceeds available ${product.quantityAvailable}`,
      );
    }

    const [order] = await tx
      .insert(orders)
      .values({
        consumerId,
        productId,
        quantity,
        totalAmount,
      })
      .returning({ id: orders.id });

    await tx.insert(orderLegs).values({
      orderId: order.id,
      legType: "raw_supply",
      assignedUserId: product.sellerId,
      status: "assigned",
      assignedAt: new Date(),
      amount: productAmount.toFixed(2),
    });

    for (const leg of legAmounts) {
      await tx.insert(orderLegs).values({
        orderId: order.id,
        legType: leg.legType,
        assignedUserId: leg.assignedUserId,
        status: "pending",
        amount: leg.amount.toFixed(2),
      });
    }

    return order;
  });

  return { orderId: result.id, totalAmount };
}
