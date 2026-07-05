"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type ResetPasswordState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("Password reset error:", error.message);
    if (error.message.toLowerCase().includes("session")) {
      return {
        error:
          "Your reset link has expired or is invalid. Please request a new one.",
      };
    }
    return { error: error.message };
  }

  return { success: true };
}
