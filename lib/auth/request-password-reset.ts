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

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  if (checkRateLimit(`reset:${email}`)) {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      console.error("Password reset request error:", error.message);
    }
  }

  return {
    message:
      "If an account exists for that email, we've sent a reset link.",
  };
}
