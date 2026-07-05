import { db as defaultDb } from "@/db/client";
import { disputes, orderLegs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

export type RaiseDisputeInput = {
  legId: string;
  raisedByUserId: string;
  reason: string;
};

export type RaiseDisputeResult = {
  disputeId: string;
  legId: string;
  status: string;
};

export async function raiseDispute(
  input: RaiseDisputeInput,
  db: DbInstance = defaultDb,
): Promise<RaiseDisputeResult> {
  const { legId, raisedByUserId, reason } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error("Reason is required to raise a dispute");
  }

  const [raisedByUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, raisedByUserId));

  if (!raisedByUser) {
    throw new Error(`User ${raisedByUserId} not found`);
  }

  const [leg] = await db
    .select()
    .from(orderLegs)
    .where(eq(orderLegs.id, legId));

  if (!leg) {
    throw new Error(`Leg ${legId} not found`);
  }

  const isConsumer = raisedByUser.role === "consumer" || raisedByUser.role === "retailer";
  const isAssignedUser = leg.assignedUserId === raisedByUserId;

  if (!isConsumer && !isAssignedUser) {
    throw new Error("Only the order's consumer or the assigned leg-holder can raise a dispute");
  }

  const [existingDispute] = await db
    .select()
    .from(disputes)
    .where(eq(disputes.orderLegId, legId));

  if (existingDispute && existingDispute.status === "open") {
    throw new Error("A dispute is already open for this leg");
  }

  const [dispute] = await db
    .insert(disputes)
    .values({
      orderLegId: legId,
      raisedByUserId,
      reason,
      status: "open",
    })
    .returning({ id: disputes.id });

  return { disputeId: dispute.id, legId, status: "open" };
}