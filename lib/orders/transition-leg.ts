import { db as defaultDb } from "@/db/client";
import { orderLegs, legStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

type LegStatus = (typeof legStatusEnum)[number];

export type TransitionLegInput = {
  legId: string;
  actorUserId: string;
  toStatus: LegStatus;
};

export type TransitionLegResult = {
  legId: string;
  status: string;
};

const LEGAL_TRANSITIONS: Record<LegStatus, LegStatus[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: ["paid"],
  paid: [],
  cancelled: [],
};

export async function transitionLeg(
  input: TransitionLegInput,
  db: DbInstance = defaultDb,
): Promise<TransitionLegResult> {
  const { legId, actorUserId, toStatus } = input;

  const [leg] = await db
    .select()
    .from(orderLegs)
    .where(eq(orderLegs.id, legId));

  if (!leg) {
    throw new Error(`Leg ${legId} not found`);
  }

  const currentStatus = leg.status as LegStatus;
  const allowed = LEGAL_TRANSITIONS[currentStatus];

  if (!allowed.includes(toStatus)) {
    throw new Error(
      `Illegal transition: ${currentStatus} → ${toStatus}`,
    );
  }

  if (leg.assignedUserId && leg.assignedUserId !== actorUserId) {
    throw new Error(
      `User ${actorUserId} is not authorized to transition leg ${legId}`,
    );
  }

  const updates: Record<string, unknown> = { status: toStatus };
  if (toStatus === "assigned") {
    updates.assignedUserId = actorUserId;
    updates.assignedAt = new Date();
  }
  if (toStatus === "completed") {
    updates.completedAt = new Date();
  }

  await db
    .update(orderLegs)
    .set(updates)
    .where(eq(orderLegs.id, legId));

  return { legId, status: toStatus };
}
