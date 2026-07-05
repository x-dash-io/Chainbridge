import { db as defaultDb } from "@/db/client";
import { orderLegs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";
import { requireAdmin } from "@/lib/auth/authorization";
import { recordAuditEvent } from "@/lib/audit/audit-log";

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

const VALID_OVERRIDE_STATUSES = ["pending", "assigned", "in_progress", "completed", "paid", "cancelled"] as const;

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

  if (!admin) {
    throw new Error(`Admin user ${adminId} not found`);
  }

  requireAdmin({ ...admin, email: "", phone: null });

  const [leg] = await db
    .select()
    .from(orderLegs)
    .where(eq(orderLegs.id, legId));

  if (!leg) {
    throw new Error(`Leg ${legId} not found`);
  }

  if (!VALID_OVERRIDE_STATUSES.includes(toStatus as typeof VALID_OVERRIDE_STATUSES[number])) {
    throw new Error(`Invalid status: ${toStatus}`);
  }

  const previousStatus = leg.status;

  await db
    .update(orderLegs)
    .set({ status: toStatus as typeof VALID_OVERRIDE_STATUSES[number] })
    .where(eq(orderLegs.id, legId));

  await recordAuditEvent(
    {
      eventType: "admin.override",
      actorId: adminId,
      resourceType: "order_leg",
      resourceId: legId,
      details: {
        orderId: leg.orderId,
        legType: leg.legType,
        fromStatus: previousStatus,
        toStatus,
        reason,
      },
    },
    db,
  );

  return { legId, status: toStatus, reason };
}
