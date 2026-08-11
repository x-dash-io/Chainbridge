"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const RequestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address."),
});

export type RequestPasswordResetState = {
  message?: string;
  error?: string;
} | null;

/**
 * Get the site URL with proper protocol handling for localhost and production
 */
async function getSiteUrl(): Promise<string> {
  // Priority 1: Use environment variable if set
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Priority 2: Detect from headers
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  
  // Detect protocol
  const forwardedProto = headersList.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  
  return `${protocol}://${host}`;
}

export async function requestPasswordReset(
  _prevState: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const parsed = RequestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Invalid email address." };
  }

  const { email } = parsed.data;

  // Rate limiting to prevent abuse
  if (checkRateLimit(`reset:${email}`)) {
    const supabase = await createClient();
    const siteUrl = await getSiteUrl();
    const redirectTo = `${siteUrl}/reset-password`;

    console.log(`Password reset requested for ${email}, redirecting to: ${redirectTo}`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      console.error("Password reset request error:", error.message);
      // Still return success message for security (don't reveal if email exists)
    } else {
      console.log(`Password reset email sent successfully to ${email}`);
    }
  } else {
    console.log(`Rate limit exceeded for password reset: ${email}`);
  }

  // Always return success message for security (don't reveal if email exists)
  return {
    message:
      "If an account exists for that email, we've sent a reset link.",
  };
}
