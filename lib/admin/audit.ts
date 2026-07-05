"use server";

import { db } from "@/db/client";
import { auditLogs, users } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/authorization";

export type AuditEntry = {
  id: string;
  eventType: string;
  actorId: string;
  actorName: string;
  resourceType: string;
  resourceId: string;
  details: string | null;
  createdAt: string;
};

export async function getRecentAuditEvents(
  limit = 100,
): Promise<AuditEntry[]> {
  const admin = await getUser();
  requireAdmin(admin);

  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actorId))];
  const actorRows = actorIds.length > 0
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, actorIds))
    : [];
  const actorMap = new Map(actorRows.map((a) => [a.id, a.name]));

  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    actorId: r.actorId,
    actorName: r.actorId === "system" ? "System" : actorMap.get(r.actorId) ?? "Unknown",
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    details: r.details,
    createdAt: r.createdAt?.toISOString() ?? "",
  }));
}
