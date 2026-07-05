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
  details?: Record<string, unknown> | string | null;
};

function serializeDetails(
  details?: Record<string, unknown> | string | null,
): string | null {
  if (details == null) {
    return null;
  }

  if (typeof details === "string") {
    return details;
  }

  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(
      (_entry): _entry is [string, unknown] => {
        const [, value] = _entry;
        return value !== undefined && typeof value !== "function";
      },
    ),
  );

  return Object.keys(safeDetails).length > 0
    ? JSON.stringify(safeDetails)
    : null;
}

export async function recordAuditEvent(
  input: AuditEventInput,
  db: DbInstance = defaultDb,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      eventType: input.eventType,
      actorId: input.actorId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      details: serializeDetails(input.details),
    });
  } catch (error) {
    console.error("Failed to record audit event", {
      eventType: input.eventType,
      actorId: input.actorId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      details: input.details,
      error,
    });
  }
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
