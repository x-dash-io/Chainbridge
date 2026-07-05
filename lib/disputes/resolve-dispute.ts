import { db as defaultDb } from "@/db/client";
import { disputes, orderLegs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

export type ResolveDisputeInput = {
  disputeId: string;
  adminId: string;
  resolution: "override" | "refund_flagged";
  notes: string;
};

export type ResolveDisputeResult = {
  disputeId: string;
  resolution: string;
  resolvedAt: Date;
};

export async function resolveDispute(
  input: ResolveDisputeInput,
  db: DbInstance = defaultDb,
): Promise<ResolveDisputeResult> {
  const { disputeId, adminId, resolution, notes } = input;

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId));

  if (!admin) {
    throw new Error(`Admin user ${adminId} not found`);
  }

  if (admin.role !== "admin") {
    throw new Error("Only admins can resolve disputes");
  }

  if (!notes || notes.trim().length === 0) {
    throw new Error("Resolution notes are required");
  }

  const [dispute] = await db
    .select()
    .from(disputes)
    .where(eq(disputes.id, disputeId));

  if (!dispute) {
    throw new Error(`Dispute ${disputeId} not found`);
  }

  if (dispute.status !== "open") {
    throw new Error(`Dispute ${disputeId} is already resolved`);
  }

  const resolutionStatus = resolution === "override"
    ? "resolved_override"
    : "resolved_refund_flagged";

  const [updated] = await db
    .update(disputes)
    .set({
      status: resolutionStatus,
      resolutionNotes: notes,
      resolvedByAdminId: adminId,
      resolvedAt: new Date(),
    })
    .where(eq(disputes.id, disputeId))
    .returning({ id: disputes.id });

  if (!updated) {
    throw new Error("Failed to resolve dispute");
  }

  return {
    disputeId: updated.id,
    resolution: resolutionStatus,
    resolvedAt: new Date(),
  };
}