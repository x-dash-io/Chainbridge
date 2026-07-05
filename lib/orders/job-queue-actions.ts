"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { orderLegs, orders, products, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { transitionLeg } from "@/lib/orders/transition-leg";
import { revalidatePath } from "next/cache";

const legTypeForRole: Record<string, "processing" | "packing" | "delivery"> = {
  processor: "processing",
  packer: "packing",
  delivery_agent: "delivery",
};

export type JobItem = {
  legId: string;
  orderId: string;
  productName: string;
  legType: string;
  status: string;
  amount: string;
  assignedAt: string | null;
  completedAt: string | null;
  consumerName: string;
  quantity: number;
  totalAmount: string;
};

const TransitionJobSchema = z.object({
  legId: z.string().uuid(),
  toStatus: z.enum(["assigned", "in_progress", "completed"]),
});

export type JobActionState = {
  error?: string;
  success?: boolean;
} | null;

export async function acceptJob(
  _prevState: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  try {
    const user = await getUser();
    const parsed = TransitionJobSchema.safeParse({
      legId: formData.get("legId"),
      toStatus: "assigned",
    });
    if (!parsed.success) return { error: "Invalid leg." };

    const legType = legTypeForRole[user.role];
    if (!legType) return { error: "Invalid role." };

    const [leg] = await db
      .select()
      .from(orderLegs)
      .where(
        and(
          eq(orderLegs.id, parsed.data.legId),
          eq(orderLegs.legType, legType),
          eq(orderLegs.status, "pending"),
          eq(orderLegs.assignedUserId, null as unknown as string),
        ),
      );

    if (!leg) return { error: "Leg not found or already assigned." };

    await transitionLeg({
      legId: parsed.data.legId,
      actorUserId: user.id,
      toStatus: "assigned",
    });

    revalidatePath(`/${user.role === "delivery_agent" ? "delivery" : user.role}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to accept job." };
  }
}

export async function startJob(
  _prevState: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  try {
    const user = await getUser();
    const parsed = TransitionJobSchema.safeParse({
      legId: formData.get("legId"),
      toStatus: "in_progress",
    });
    if (!parsed.success) return { error: "Invalid leg." };

    const [leg] = await db
      .select()
      .from(orderLegs)
      .where(
        and(eq(orderLegs.id, parsed.data.legId), eq(orderLegs.assignedUserId, user.id)),
      );

    if (!leg) return { error: "Leg not found or not assigned to you." };

    await transitionLeg({
      legId: parsed.data.legId,
      actorUserId: user.id,
      toStatus: "in_progress",
    });

    revalidatePath(`/${user.role === "delivery_agent" ? "delivery" : user.role}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to start job." };
  }
}

export async function completeJob(
  _prevState: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  try {
    const user = await getUser();
    const parsed = TransitionJobSchema.safeParse({
      legId: formData.get("legId"),
      toStatus: "completed",
    });
    if (!parsed.success) return { error: "Invalid leg." };

    const [leg] = await db
      .select()
      .from(orderLegs)
      .where(
        and(eq(orderLegs.id, parsed.data.legId), eq(orderLegs.assignedUserId, user.id)),
      );

    if (!leg) return { error: "Leg not found or not assigned to you." };

    await transitionLeg({
      legId: parsed.data.legId,
      actorUserId: user.id,
      toStatus: "completed",
    });

    revalidatePath(`/${user.role === "delivery_agent" ? "delivery" : user.role}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to complete job." };
  }
}

export async function getAvailableJobs(role: string): Promise<JobItem[]> {
  const legType = legTypeForRole[role];
  if (!legType) return [];

  const rows = await db
    .select({
      legId: orderLegs.id,
      orderId: orderLegs.orderId,
      legType: orderLegs.legType,
      status: orderLegs.status,
      amount: orderLegs.amount,
      assignedAt: orderLegs.assignedAt,
      completedAt: orderLegs.completedAt,
      quantity: orders.quantity,
      totalAmount: orders.totalAmount,
      productName: products.name,
      consumerName: users.name,
    })
    .from(orderLegs)
    .innerJoin(orders, eq(orderLegs.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.consumerId, users.id))
    .where(
      and(
        eq(orderLegs.legType, legType),
        eq(orderLegs.status, "pending"),
      ),
    );

  return rows.map((r) => ({
    ...r,
    status: r.status ?? "pending",
    assignedAt: r.assignedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}

export async function getMyJobs(userId: string, role: string): Promise<JobItem[]> {
  const legType = legTypeForRole[role];
  if (!legType) return [];

  const rows = await db
    .select({
      legId: orderLegs.id,
      orderId: orderLegs.orderId,
      legType: orderLegs.legType,
      status: orderLegs.status,
      amount: orderLegs.amount,
      assignedAt: orderLegs.assignedAt,
      completedAt: orderLegs.completedAt,
      quantity: orders.quantity,
      totalAmount: orders.totalAmount,
      productName: products.name,
      consumerName: users.name,
    })
    .from(orderLegs)
    .innerJoin(orders, eq(orderLegs.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(users, eq(orders.consumerId, users.id))
    .where(
      and(
        eq(orderLegs.legType, legType),
        eq(orderLegs.assignedUserId, userId),
      ),
    )
    .orderBy(orderLegs.assignedAt);

  return rows.map((r) => ({
    ...r,
    status: r.status ?? "pending",
    assignedAt: r.assignedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}
