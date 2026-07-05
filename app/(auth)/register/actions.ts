"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { z } from "zod";

const ALLOWED_ROLES = [
  "producer",
  "processor",
  "packer",
  "delivery_agent",
  "retailer",
  "consumer",
] as const;

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1, "Name is required.").max(255),
  phone: z.string().optional(),
  role: z.enum(ALLOWED_ROLES, { message: "Please select a valid role." }),
});

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = RegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Failed to create account. Please try again." };
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: confirmError } =
    await admin.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    });

  if (confirmError) {
    console.error("Admin confirm failed for user", data.user.id, confirmError);
  }

  try {
    await db
      .insert(users)
      .values({
        id: data.user.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          role: parsed.data.role,
        },
      });
  } catch (err) {
    console.error("Profile insert failed for user", data.user.id, err);
    return {
      error:
        "Account created but profile setup failed. Please contact support.",
    };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (!signInError) {
    const dashPath =
      parsed.data.role === "delivery_agent" ? "delivery" : parsed.data.role;
    redirect(`/${dashPath}`);
  }

  return { error: "Account created. Please try signing in." };
}
