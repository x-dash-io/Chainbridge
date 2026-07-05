import { db as defaultDb } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

export type VerifyUserInput = {
  adminId: string;
  targetUserId: string;
  verified: boolean;
};

export type VerifyUserResult = {
  userId: string;
  verified: boolean;
};

export async function verifyUser(
  input: VerifyUserInput,
  db: DbInstance = defaultDb,
): Promise<VerifyUserResult> {
  const { adminId, targetUserId, verified } = input;

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId));

  if (!admin || admin.role !== "admin") {
    throw new Error("Admin authorization required");
  }

  if (adminId === targetUserId) {
    throw new Error("Admins cannot verify themselves");
  }

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId));

  if (!targetUser) {
    throw new Error(`User ${targetUserId} not found`);
  }

  await db
    .update(users)
    .set({ verified })
    .where(eq(users.id, targetUserId));

  return { userId: targetUserId, verified };
}