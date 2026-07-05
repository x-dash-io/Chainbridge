"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { products, orderLegs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { transitionLeg } from "@/lib/orders/transition-leg";
import { deleteAsset } from "@/lib/media/delete-asset";
import { revalidatePath } from "next/cache";

const PostProductSchema = z.object({
  name: z.string().min(1, "Product name is required.").max(255),
  category: z.string().optional(),
  unit: z.string().optional(),
  pricePerUnit: z.coerce.number().positive("Price must be greater than 0."),
  quantityAvailable: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than 0."),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  imagePublicId: z.string().optional(),
});

const EditProductSchema = PostProductSchema.extend({
  productId: z.string().uuid(),
});

const DelistProductSchema = z.object({
  productId: z.string().uuid(),
});

const LegActionSchema = z.object({
  legId: z.string().uuid(),
});

export type ProductActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

export async function postProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const user = await getUser();
    if (user.role !== "producer") return { error: "Only producers can post products." };

    const parsed = PostProductSchema.safeParse({
      name: formData.get("name"),
      category: formData.get("category"),
      unit: formData.get("unit"),
      pricePerUnit: formData.get("pricePerUnit"),
      quantityAvailable: formData.get("quantityAvailable"),
      description: formData.get("description"),
      imageUrl: formData.get("imageUrl"),
    });

    if (!parsed.success) {
      return {
        error: "Invalid input.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await db.insert(products).values({
      sellerId: user.id,
      sellerRole: "producer",
      name: parsed.data.name,
      category: parsed.data.category || null,
      unit: parsed.data.unit || null,
      pricePerUnit: parsed.data.pricePerUnit.toString(),
      quantityAvailable: parsed.data.quantityAvailable,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      imagePublicId: parsed.data.imagePublicId || null,
    });

    revalidatePath("/producer");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to post product." };
  }
}

export async function updateProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const user = await getUser();
    if (user.role !== "producer") return { error: "Only producers can update products." };

    const parsed = EditProductSchema.safeParse({
      productId: formData.get("productId"),
      name: formData.get("name"),
      category: formData.get("category"),
      unit: formData.get("unit"),
      pricePerUnit: formData.get("pricePerUnit"),
      quantityAvailable: formData.get("quantityAvailable"),
      description: formData.get("description"),
      imageUrl: formData.get("imageUrl"),
    });

    if (!parsed.success) {
      return {
        error: "Invalid input.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(eq(products.id, parsed.data.productId), eq(products.sellerId, user.id)),
      )
      .limit(1);

    if (!existing) return { error: "Product not found." };

    if (existing.imagePublicId && existing.imagePublicId !== parsed.data.imagePublicId) {
      deleteAsset(existing.imagePublicId, parsed.data.productId).catch(() => {});
    }

    await db
      .update(products)
      .set({
        name: parsed.data.name,
        category: parsed.data.category || null,
        unit: parsed.data.unit || null,
        pricePerUnit: parsed.data.pricePerUnit.toString(),
        quantityAvailable: parsed.data.quantityAvailable,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl || null,
        imagePublicId: parsed.data.imagePublicId || null,
      })
      .where(eq(products.id, parsed.data.productId));

    revalidatePath("/producer");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update product." };
  }
}

export async function delistProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const user = await getUser();
    if (user.role !== "producer") return { error: "Only producers can delist products." };

    const parsed = DelistProductSchema.safeParse({
      productId: formData.get("productId"),
    });

    if (!parsed.success) return { error: "Invalid product." };

    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(eq(products.id, parsed.data.productId), eq(products.sellerId, user.id)),
      )
      .limit(1);

    if (!existing) return { error: "Product not found." };

    if (existing.imagePublicId) {
      await deleteAsset(existing.imagePublicId, parsed.data.productId);
    }

    await db
      .update(products)
      .set({ status: "delisted", imageUrl: null, imagePublicId: null })
      .where(eq(products.id, parsed.data.productId));

    revalidatePath("/producer");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delist product." };
  }
}

export async function startLeg(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const user = await getUser();
    if (user.role !== "producer") return { error: "Only producers can start legs." };

    const parsed = LegActionSchema.safeParse({
      legId: formData.get("legId"),
    });

    if (!parsed.success) return { error: "Invalid leg." };

    const legId = parsed.data.legId;

    const [leg] = await db
      .select()
      .from(orderLegs)
      .where(eq(orderLegs.id, legId));

    if (!leg) return { error: "Leg not found." };

    if (leg.status === "pending") {
      await transitionLeg({ legId, actorUserId: user.id, toStatus: "assigned" });
    }

    await transitionLeg({ legId, actorUserId: user.id, toStatus: "in_progress" });

    revalidatePath("/producer");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to start leg.",
    };
  }
}

export async function completeLeg(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const user = await getUser();
    if (user.role !== "producer") return { error: "Only producers can complete legs." };

    const parsed = LegActionSchema.safeParse({
      legId: formData.get("legId"),
    });

    if (!parsed.success) return { error: "Invalid leg." };

    await transitionLeg({
      legId: parsed.data.legId,
      actorUserId: user.id,
      toStatus: "completed",
    });

    revalidatePath("/producer");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to complete leg.",
    };
  }
}
