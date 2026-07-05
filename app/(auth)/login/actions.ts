"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.error("Login error:", error.message);
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
      };
    }
    if (error.status === 429 || error.message.includes("rate limit")) {
      return {
        error: "Too many requests. Please wait a moment and try again.",
      };
    }
    return { error: "Invalid email or password." };
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    console.error("Login: no user after signInWithPassword");
    return { error: "Sign-in failed. Please try again." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!user) {
    console.error("Login: no profile for auth user", authUser.id);
    return { error: "Account not found." };
  }

  const dashPath = user.role === "delivery_agent" ? "delivery" : user.role;
  redirect(`/${dashPath}`);
}
