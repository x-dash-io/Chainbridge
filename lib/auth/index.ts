import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AuthUser = {
  id: string;
  authId?: string;
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
    // The Supabase Auth user's own id — NOT necessarily the same as
    // user.id above. Seeded accounts (see scripts/seed-supabase-auth.ts)
    // are created in Supabase Auth without pinning the auth id to the
    // database row's id, so the two can differ and the row is matched by
    // email instead. Anything that needs to call the Supabase Admin API
    // for "this signed-in person" (e.g. syncing user_metadata) MUST use
    // authId, not id — using id would silently target the wrong (or a
    // nonexistent) auth user and the update would never take effect.
    authId: authUser.id,
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
    // Must target the real Supabase Auth user id (user.authId), not the
    // database row id (user.id) — see the comment in getUser() above.
    // Calling updateUserById with the wrong id used to silently fail to
    // sync the role into user_metadata, which meant proxy.ts (the edge
    // middleware, which only has access to user_metadata) kept bouncing
    // seeded accounts to the wrong dashboard forever — an infinite
    // redirect loop for every seeded/demo account. getUser() always sets
    // authId, so this fallback is defensive only.
    await admin.auth.admin.updateUserById(user.authId ?? user.id, {
      user_metadata: { ...existingMetadata, role: user.role },
    });

    const dashPath = user.role === "delivery_agent" ? "delivery" : user.role;
    redirect(`/${dashPath}`);
  }

  return user;
}