"use server";

import { createHash } from "node:crypto";
import { getUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit/shared";

export type UploadSignatureResult =
  | {
      signature: string;
      timestamp: number;
      cloudName: string;
      apiKey: string;
      folder: string;
    }
  | { error: string };

export async function getUploadSignature(): Promise<UploadSignatureResult> {
  try {
    const user = await getUser();

    if (!checkRateLimit(`upload:${user.id}`, "upload-signature")) {
      return { error: "Rate limit exceeded. Maximum 20 uploads per hour." };
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return { error: "Cloudinary is not configured." };
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "chainbridge/products";

    const params: Record<string, string> = {
      folder,
      timestamp: String(timestamp),
      allowed_formats: "jpg,png,webp",
      max_file_size: "5242880",
    };

    const sortedKeys = Object.keys(params).sort();
    const signatureString =
      sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + apiSecret;
    const signature = createHash("sha1")
      .update(signatureString)
      .digest("hex");

    return { signature, timestamp, cloudName, apiKey, folder };
  } catch (err) {
    if (err instanceof Error && "digest" in err) throw err;
    return { error: "Failed to generate upload signature." };
  }
}
