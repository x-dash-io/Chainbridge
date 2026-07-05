"use server";

import { createHash } from "node:crypto";
import { getUser } from "@/lib/auth";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export type DeleteAssetResult = { success: true } | { error: string };

export async function deleteAsset(
  publicId: string,
  productId: string,
): Promise<DeleteAssetResult> {
  try {
    const user = await getUser();

    const [product] = await db
      .select({ id: products.id, sellerId: products.sellerId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return { error: "Product not found." };
    }

    if (product.sellerId !== user.id) {
      return { error: "You do not own this product." };
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return { error: "Cloudinary is not configured." };
    }

    const timestamp = Math.round(Date.now() / 1000);
    const destroySignature = createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const formData = new URLSearchParams();
    formData.append("public_id", publicId);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", apiKey);
    formData.append("signature", destroySignature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      { method: "POST", body: formData },
    );

    const result = await response.json();

    if (result.result !== "ok") {
      return { error: `Cloudinary deletion failed: ${result.result ?? "unknown error"}` };
    }

    await db
      .update(products)
      .set({ imageUrl: null, imagePublicId: null })
      .where(eq(products.id, productId));

    return { success: true };
  } catch (err) {
    if (err instanceof Error && "digest" in err) throw err;
    return { error: "Failed to delete asset." };
  }
}
