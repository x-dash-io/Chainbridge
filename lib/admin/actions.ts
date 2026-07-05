"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { users, orders, orderLegs, products, disputes } from "@/db/schema";
import { eq, or, inArray, desc, asc, like } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/authorization";
import { verifyUser } from "@/lib/admin/verify-user";
import { overrideLeg } from "@/lib/admin/override-leg";
import { resolveDispute } from "@/lib/disputes/resolve-dispute";
import { revalidatePath } from "next/cache";
import { getSystemConsistencyReport } from "@/lib/orders/revenue";

function getLegStatusPriority(status: string | null): number {
  const order: Record<string, number> = {
    open: 0,
    under_review: 1,
    resolved_override: 2,
    resolved_refund_flagged: 2,
  };
  return order[status ?? ""] ?? 99;
}

const VerifyUserSchema = z.object({
  targetUserId: z.string().uuid(),
  verified: z.coerce.boolean(),
});

const OverrideLegSchema = z.object({
  legId: z.string().uuid(),
  toStatus: z.string(),
  reason: z.string().min(1, "Reason is required"),
});

const ResolveDisputeSchema = z.object({
  disputeId: z.string().uuid(),
  resolution: z.enum(["override", "refund_flagged"]),
  notes: z.string().min(1, "Resolution notes are required"),
});

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  verified: boolean | null;
  createdAt: string | null;
};

export type AdminOrder = {
  id: string;
  consumerId: string;
  consumerName: string;
  productId: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  createdAt: string | null;
  status: "pending" | "in_progress" | "completed";
};

export type AdminDispute = {
  id: string;
  orderLegId: string;
  legType: string;
  raisedByUserId: string;
  raisedByName: string;
  reason: string;
  status: string | null;
  resolutionNotes: string | null;
  createdAt: string | null;
};

export type LegDetail = {
  id: string;
  orderId: string;
  legType: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  status: string | null;
  amount: string;
  assignedAt: string | null;
  completedAt: string | null;
};

export type ReportData = {
  orderVolume: Array<{ date: string; count: number }>;
  activeUsersPerRole: Array<{ role: string; count: number }>;
  totalValueTransacted: string;
  avgTimeToCompletion: Array<{ legType: string; avgHours: number | null }>;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const admin = await getUser();
  requireAdmin(admin);

  const rows = await db
    .select()
    .from(users)
    .orderBy(users.createdAt);

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    verified: u.verified,
    createdAt: u.createdAt?.toISOString() ?? null,
  }));
}

export async function searchUsers(query: string): Promise<AdminUser[]> {
  const admin = await getUser();
  requireAdmin(admin);

  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(users)
    .where(
      or(
        like(users.name, pattern),
        like(users.email, pattern),
        like(users.phone, pattern),
      ),
    )
    .orderBy(users.createdAt);

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    verified: u.verified,
    createdAt: u.createdAt?.toISOString() ?? null,
  }));
}

export async function verifyUserAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean } | null> {
  try {
    const admin = await getUser();
    const parsed = VerifyUserSchema.safeParse({
      targetUserId: formData.get("targetUserId"),
      verified: formData.get("verified"),
    });
    if (!parsed.success) return { error: "Invalid input." };

    await verifyUser({
      adminId: admin.id,
      targetUserId: parsed.data.targetUserId,
      verified: parsed.data.verified,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to verify user." };
  }
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const admin = await getUser();
  requireAdmin(admin);

  const orderRows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));

  if (orderRows.length === 0) return [];

  const consumerIds = [...new Set(orderRows.map((o) => o.consumerId))];
  const consumerRows = consumerIds.length > 0
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, consumerIds))
    : [];
  const consumerMap = new Map(consumerRows.map((c) => [c.id, c.name]));

  const productIds = [...new Set(orderRows.map((o) => o.productId))];
  const productRows = productIds.length > 0
    ? await db
        .select()
        .from(products)
        .where(inArray(products.id, productIds))
    : [];
  const productMap = new Map(productRows.map((p) => [p.id, p.name]));

  const orderIds = orderRows.map((o) => o.id);
  const legRows = orderIds.length > 0
    ? await db
        .select()
        .from(orderLegs)
        .where(inArray(orderLegs.orderId, orderIds))
    : [];

  const legsByOrder = new Map<string, typeof legRows>();
  for (const leg of legRows) {
    const existing = legsByOrder.get(leg.orderId) ?? [];
    existing.push(leg);
    legsByOrder.set(leg.orderId, existing);
  }

  return orderRows.map((order) => {
    const orderLegsList = legsByOrder.get(order.id) ?? [];
    const allCancelled = orderLegsList.every((l) => l.status === "cancelled");
    const nonCancelled = orderLegsList.filter((l) => l.status !== "cancelled");
    const allPaid = nonCancelled.length > 0 && nonCancelled.every((l) => l.status === "paid");
    const allPending = nonCancelled.every((l) => l.status === "pending");
    const status = allCancelled ? "cancelled" : allPaid ? "completed" : allPending ? "pending" : "in_progress";

    return {
      id: order.id,
      consumerId: order.consumerId,
      consumerName: consumerMap.get(order.consumerId) ?? "Unknown",
      productId: order.productId,
      productName: productMap.get(order.productId) ?? "Unknown",
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt?.toISOString() ?? null,
      status: status as "pending" | "in_progress" | "completed",
    };
  });
}

export async function searchOrders(query: string): Promise<AdminOrder[]> {
  const admin = await getUser();
  requireAdmin(admin);

  const pattern = `%${query}%`;
  const allOrders = await getAdminOrders();

  return allOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(query.toLowerCase()) ||
      o.consumerName.toLowerCase().includes(query.toLowerCase()) ||
      o.productName.toLowerCase().includes(query.toLowerCase()),
  );
}

export async function getOrderLegs(orderId: string): Promise<LegDetail[]> {
  const admin = await getUser();
  requireAdmin(admin);

  const legRows = await db
    .select()
    .from(orderLegs)
    .where(eq(orderLegs.orderId, orderId));

  if (legRows.length === 0) return [];

  const assigneeIds = legRows.map((l) => l.assignedUserId).filter(Boolean);
  const assigneeRows = assigneeIds.length > 0
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, assigneeIds as string[]))
    : [];
  const assigneeMap = new Map(assigneeRows.map((a) => [a.id, a.name]));

  return legRows.map((l) => ({
    id: l.id,
    orderId: l.orderId,
    legType: l.legType,
    assignedUserId: l.assignedUserId,
    assignedUserName: l.assignedUserId ? assigneeMap.get(l.assignedUserId) ?? null : null,
    status: l.status,
    amount: l.amount,
    assignedAt: l.assignedAt?.toISOString() ?? null,
    completedAt: l.completedAt?.toISOString() ?? null,
  }));
}

export async function overrideLegAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean } | null> {
  try {
    const admin = await getUser();
    const parsed = OverrideLegSchema.safeParse({
      legId: formData.get("legId"),
      toStatus: formData.get("toStatus"),
      reason: formData.get("reason"),
    });
    if (!parsed.success) return { error: "Invalid input. Reason is required." };

    await overrideLeg({
      adminId: admin.id,
      legId: parsed.data.legId,
      toStatus: parsed.data.toStatus,
      reason: parsed.data.reason,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to override leg." };
  }
}

export async function getAdminDisputes(): Promise<AdminDispute[]> {
  const admin = await getUser();
  requireAdmin(admin);

  const disputeRows = await db
    .select()
    .from(disputes)
    .orderBy(asc(disputes.createdAt));

  if (disputeRows.length === 0) return [];

  const userIds = [...new Set(disputeRows.map((d) => d.raisedByUserId))];
  const userRows = userIds.length > 0
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(userRows.map((u) => [u.id, u.name]));

  const legIds = disputeRows.map((d) => d.orderLegId);
  const legRows = legIds.length > 0
    ? await db
        .select()
        .from(orderLegs)
        .where(inArray(orderLegs.id, legIds))
    : [];
  const legMap = new Map(legRows.map((l) => [l.id, l.legType]));

  return disputeRows
    .map((d) => ({
      id: d.id,
      orderLegId: d.orderLegId,
      legType: legMap.get(d.orderLegId) ?? "unknown",
      raisedByUserId: d.raisedByUserId,
      raisedByName: userMap.get(d.raisedByUserId) ?? "Unknown",
      reason: d.reason,
      status: d.status,
      resolutionNotes: d.resolutionNotes,
      createdAt: d.createdAt?.toISOString() ?? null,
    }))
    .sort((a, b) => {
      const aPriority = getLegStatusPriority(a.status);
      const bPriority = getLegStatusPriority(b.status);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    });
}

export async function resolveDisputeAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean } | null> {
  try {
    const admin = await getUser();
    const parsed = ResolveDisputeSchema.safeParse({
      disputeId: formData.get("disputeId"),
      resolution: formData.get("resolution"),
      notes: formData.get("notes"),
    });
    if (!parsed.success) return { error: "Invalid input. Resolution notes are required." };

    await resolveDispute({
      disputeId: parsed.data.disputeId,
      adminId: admin.id,
      resolution: parsed.data.resolution,
      notes: parsed.data.notes,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to resolve dispute." };
  }
}

export async function getAdminReports(): Promise<ReportData & { consistency: Awaited<ReturnType<typeof getSystemConsistencyReport>> }> {
  const admin = await getUser();
  requireAdmin(admin);

  const orderRows = await db
    .select({
      createdAt: orders.createdAt,
      totalAmount: orders.totalAmount,
    })
    .from(orders);

  const userRows = await db
    .select({
      role: users.role,
      id: users.id,
    })
    .from(users);

  const legRows = await db
    .select()
    .from(orderLegs);

  const volumeByDate = new Map<string, number>();
  let totalValue = 0;
  for (const o of orderRows) {
    if (o.createdAt) {
      const dateKey = o.createdAt.toISOString().slice(0, 10);
      volumeByDate.set(dateKey, (volumeByDate.get(dateKey) ?? 0) + 1);
    }
    totalValue += parseFloat(o.totalAmount);
  }

  const activeUsersByRole = new Map<string, number>();
  for (const u of userRows) {
    activeUsersByRole.set(u.role, (activeUsersByRole.get(u.role) ?? 0) + 1);
  }

  const completedLegs = legRows.filter((l) => l.status === "completed" && l.assignedAt && l.completedAt);
  const avgTimeByLegType = new Map<string, { total: number; count: number }>();
  for (const l of completedLegs) {
    const diffMs = l.completedAt!.getTime() - l.assignedAt!.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const entry = avgTimeByLegType.get(l.legType) ?? { total: 0, count: 0 };
    entry.total += diffHours;
    entry.count += 1;
    avgTimeByLegType.set(l.legType, entry);
  }

  const consistency = await getSystemConsistencyReport();

  return {
    orderVolume: Array.from(volumeByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    activeUsersPerRole: Array.from(activeUsersByRole.entries())
      .map(([role, count]) => ({ role, count })),
    totalValueTransacted: totalValue.toFixed(2),
    avgTimeToCompletion: Array.from(avgTimeByLegType.entries())
      .map(([legType, data]) => ({
        legType,
        avgHours: Math.round((data.total / data.count) * 10) / 10,
      })),
    consistency,
  };
}
