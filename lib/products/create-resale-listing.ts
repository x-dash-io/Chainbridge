import { db as defaultDb } from "@/db/client";
import { products, orders, orderLegs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";
import { requireRetailer } from "@/lib/auth/authorization";
import { recordAuditEvent } from "@/lib/audit/audit-log";

export type CreateResaleListingInput = {
  retailerId: string;
  sourceOrderId?: string; // required unless externallySourced is true
  externallySourced?: boolean;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  quantityAvailable: number;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
};

export type CreateResaleListingResult = {
  productId: string;
};

export async function createResaleListing(
  input: CreateResaleListingInput,
  db: DbInstance = defaultDb,
): Promise<CreateResaleListingResult> {
  const {
    retailerId,
    sourceOrderId,
    externallySourced = false,
    name,
    category,
    unit,
    pricePerUnit,
    quantityAvailable,
    description,
    imageUrl,
    imagePublicId,
  } = input;

  // 1. Authorize: Check that the user is a retailer
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, retailerId));

  if (!user) {
    throw new Error(`User ${retailerId} not found`);
  }

  requireRetailer({ ...user, email: "", phone: null });

  // 2. Validate listing source
  if (!externallySourced && !sourceOrderId) {
    throw new Error(
      "A source order ID is required for resale listings unless they are marked as externally sourced.",
    );
  }

  if (sourceOrderId) {
    // Check if the source order exists
    const [sourceOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sourceOrderId));

    if (!sourceOrder) {
      throw new Error(`Source order ${sourceOrderId} not found`);
    }

    // Verify all order legs are completed or paid
    const legs = await db
      .select()
      .from(orderLegs)
      .where(eq(orderLegs.orderId, sourceOrderId));

    if (legs.length === 0) {
      throw new Error(`No legs found for source order ${sourceOrderId}`);
    }

    const uncompletedLegs = legs.filter(
      (leg) => leg.status !== "completed" && leg.status !== "paid",
    );

    if (uncompletedLegs.length > 0) {
      throw new Error(
        "Cannot create active resale listing: all legs of the source order must be completed.",
      );
    }
  }

  // 3. Insert listing into products table
  const [newProduct] = await db
    .insert(products)
    .values({
      sellerId: retailerId,
      sellerRole: "retailer",
      sourceOrderId: sourceOrderId || null,
      externallySourced,
      name,
      category,
      unit,
      pricePerUnit: pricePerUnit.toFixed(2),
      quantityAvailable,
      description: description || null,
      imageUrl: imageUrl || null,
      imagePublicId: imagePublicId || null,
      status: "active",
    })
    .returning({ id: products.id });

  await recordAuditEvent(
    {
      eventType: "resale.created",
      actorId: retailerId,
      resourceType: "product",
      resourceId: newProduct.id,
      details: {
        name,
        sourceOrderId: sourceOrderId || undefined,
        externallySourced,
      },
    },
    db,
  );

  return {
    productId: newProduct.id,
  };
}
