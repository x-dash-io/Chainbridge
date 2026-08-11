import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  verified: boolean | null;
};

export async function getUser(): Promise<AuthUser> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    redirect("/login");
  }

  // Try to find user by ID first (for cases where IDs match)
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  // If not found by ID, try to find by email (for seeded users)
  if (!user && authUser.email) {
    [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, authUser.email))
      .limit(1);
  }

  if (!user) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    verified: user.verified,
  };
}

export async function requireRole(
  ...allowedRoles: string[]
): Promise<AuthUser> {
  const user = await getUser();

  if (!allowedRoles.includes(user.role)) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const existingMetadata = data.user?.user_metadata ?? {};

    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...existingMetadata, role: user.role },
    });

    const dashPath = user.role === "delivery_agent" ? "delivery" : user.role;
    redirect(`/${dashPath}`);
  }

  return user;
}
