import { db as defaultDb } from "@/db/client";
import { orderLegs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

export type AdminOverrideLegInput = {
  adminId: string;
  legId: string;
  toStatus: string;
  reason: string;
};

export type AdminOverrideLegResult = {
  legId: string;
  status: string;
  reason: string;
};

export async function overrideLeg(
  input: AdminOverrideLegInput,
  db: DbInstance = defaultDb,
): Promise<AdminOverrideLegResult> {
  const { adminId, legId, toStatus, reason } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error("Reason is required for admin override");
  }

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId));

  if (!admin || admin.role !== "admin") {
    throw new Error("Admin authorization required");
  }

  const [leg] = await db
    .select()
    .from(orderLegs)
    .where(eq(orderLegs.id, legId));

  if (!leg) {
    throw new Error(`Leg ${legId} not found`);
  }

  const validStatuses = ["pending", "assigned", "in_progress", "completed", "paid", "cancelled"] as const;
  if (!validStatuses.includes(toStatus as typeof validStatuses[number])) {
    throw new Error(`Invalid status: ${toStatus}`);
  }

  await db
    .update(orderLegs)
    .set({ status: toStatus as typeof validStatuses[number] })
    .where(eq(orderLegs.id, legId));

  return { legId, status: toStatus, reason };
}