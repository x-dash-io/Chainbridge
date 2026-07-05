import { db as defaultDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

export type AuditEventType =
  | "order.created"
  | "leg.transitioned"
  | "payment.initiated"
  | "payment.callback_received"
  | "payment.completed"
  | "payment.failed"
  | "payment.ignored"
  | "payout.created"
  | "payout.paid"
  | "dispute.raised"
  | "dispute.resolved"
  | "admin.override"
  | "admin.verify_user"
  | "resale.created";

export type AuditEventInput = {
  eventType: AuditEventType;
  actorId: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
};

export async function recordAuditEvent(
  input: AuditEventInput,
  db: DbInstance = defaultDb,
): Promise<void> {
  await db.insert(auditLogs).values({
    eventType: input.eventType,
    actorId: input.actorId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    details: input.details ? JSON.stringify(input.details) : null,
  });
}

export async function getAuditEventsForResource(
  resourceType: string,
  resourceId: string,
  db: DbInstance = defaultDb,
) {
  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.resourceType, resourceType),
        eq(auditLogs.resourceId, resourceId),
      ),
    )
    .orderBy(auditLogs.createdAt);
}

export async function getRecentAuditEvents(
  limit = 50,
  db: DbInstance = defaultDb,
) {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
