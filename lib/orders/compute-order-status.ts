import { db as defaultDb } from "@/db/client";
import { orderLegs, legStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

type LegStatus = (typeof legStatusEnum)[number];

export type ComputeOrderStatusInput = {
  orderId: string;
};

export type ComputeOrderStatusResult = {
  overall: "pending" | "in_progress" | "completed" | "cancelled";
  legs: Array<{ legType: string; status: string }>;
};

export async function computeOrderStatus(
  input: ComputeOrderStatusInput,
  db: DbInstance = defaultDb,
): Promise<ComputeOrderStatusResult> {
  const legs = await db
    .select({
      legType: orderLegs.legType,
      status: orderLegs.status,
    })
    .from(orderLegs)
    .where(eq(orderLegs.orderId, input.orderId));

  if (legs.length === 0) {
    throw new Error(`Order ${input.orderId} not found or has no legs`);
  }

  const statuses = legs.map((l: { status: string | null }) => l.status as LegStatus);

  const allCancelled = statuses.every((s: string) => s === "cancelled");
  const nonCancelledStatuses = statuses.filter((s: string) => s !== "cancelled");
  const allPaid = nonCancelledStatuses.length > 0 && nonCancelledStatuses.every((s: string) => s === "paid");
  const allPending = nonCancelledStatuses.every((s: string) => s === "pending");

  let overall: "pending" | "in_progress" | "completed" | "cancelled";
  if (allCancelled) {
    overall = "cancelled";
  } else if (allPaid) {
    overall = "completed";
  } else if (allPending) {
    overall = "pending";
  } else {
    overall = "in_progress";
  }

  return {
    overall,
    legs: legs.map((l: { legType: string; status: string | null }) => ({
      legType: l.legType,
      status: l.status ?? "pending",
    })),
  };
}
