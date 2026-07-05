import { createHmac, timingSafeEqual } from "node:crypto";
import { db as defaultDb } from "@/db/client";
import { payments, orders, orderLegs, payouts } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { DbInstance } from "@/lib/db-types";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { getRequiredEnv, getOptionalEnv } from "@/lib/config/validate";

export type DarajaCallbackItem = {
  Name: string;
  Value: string | number;
};

export type DarajaCallbackBody = {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: DarajaCallbackItem[];
      };
    };
  };
};

export type ProcessCallbackResult = {
  status: "completed" | "ignored" | "failed";
};

const CALLBACK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

const processedCallbacks = new Set<string>();

function extractMetadataValue(
  items: DarajaCallbackItem[] | undefined,
  name: string,
): string | undefined {
  if (!items) return undefined;
  const item = items.find((i) => i.Name === name);
  return item ? String(item.Value) : undefined;
}

function validatePayload(body: unknown): DarajaCallbackBody {
  if (
    !body ||
    typeof body !== "object" ||
    !("Body" in (body as Record<string, unknown>))
  ) {
    throw new Error("Invalid callback payload: missing Body");
  }

  const b = body as DarajaCallbackBody;
  const cb = b.Body?.stkCallback;

  if (!cb) {
    throw new Error("Invalid callback payload: missing stkCallback");
  }

  if (typeof cb.CheckoutRequestID !== "string" || !cb.CheckoutRequestID) {
    throw new Error("Invalid callback payload: missing CheckoutRequestID");
  }

  if (typeof cb.ResultCode !== "number") {
    throw new Error("Invalid callback payload: missing or invalid ResultCode");
  }

  return b;
}

export function verifyCallbackOrigin(request?: Request): void {
  const originSecret = getOptionalEnv("MPESA_CALLBACK_SECRET");
  if (!originSecret) return;

  if (!request) {
    throw new Error("Callback origin verification requires a Request object");
  }

  const signature = request.headers.get("x-mpesa-signature");
  if (!signature) {
    throw new Error("Missing x-mpesa-signature header");
  }

  const body = request.headers.get("x-mpesa-body");
  if (!body) {
    throw new Error("Missing x-mpesa-body header");
  }

  const expected = createHmac("sha256", originSecret)
    .update(body)
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signature);

  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    throw new Error("Callback signature verification failed — possible forgery");
  }
}

function validateCallbackTimestamp(callbackBody: DarajaCallbackBody): void {
  const timestamp = extractMetadataValue(
    callbackBody.Body.stkCallback.CallbackMetadata?.Item,
    "CallbackTimestamp",
  );

  if (!timestamp) return;

  const callbackTime = new Date(timestamp).getTime();
  if (isNaN(callbackTime)) return;

  const now = Date.now();
  if (Math.abs(now - callbackTime) > CALLBACK_TIMESTAMP_TOLERANCE_MS) {
    throw new Error("Callback timestamp is outside acceptable tolerance window");
  }
}

async function checkReplay(
  checkoutRequestId: string,
  mpesaReceipt: string | undefined,
  db: DbInstance,
): Promise<boolean> {
  if (processedCallbacks.has(checkoutRequestId)) {
    return true;
  }

  if (mpesaReceipt) {
    const [existing] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.mpesaReceipt, mpesaReceipt),
          eq(payments.status, "completed"),
        ),
      )
      .limit(1);

    if (existing) {
      return true;
    }
  }

  processedCallbacks.add(checkoutRequestId);
  return false;
}

export async function processCallback(
  body: unknown,
  db: DbInstance = defaultDb,
): Promise<ProcessCallbackResult> {
  const validated = validatePayload(body);

  const { stkCallback } = validated.Body;
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.checkoutRequestId, CheckoutRequestID));

  if (!payment) {
    throw new Error(
      `No payment found for CheckoutRequestID ${CheckoutRequestID}`,
    );
  }

  if (ResultCode !== 0) {
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, payment.id));

    await recordAuditEvent(
      {
        eventType: "payment.failed",
        actorId: "system",
        resourceType: "payment",
        resourceId: payment.id,
        details: {
          checkoutRequestId: CheckoutRequestID,
          resultCode: ResultCode,
          resultDesc: stkCallback.ResultDesc,
          orderId: payment.orderId,
        },
      },
      db,
    );

    return { status: "failed" };
  }

  if (payment.status === "completed") {
    await recordAuditEvent(
      {
        eventType: "payment.ignored",
        actorId: "system",
        resourceType: "payment",
        resourceId: payment.id,
        details: {
          checkoutRequestId: CheckoutRequestID,
          reason: "duplicate callback",
          orderId: payment.orderId,
        },
      },
      db,
    );

    return { status: "ignored" };
  }

  const isReplay = await checkReplay(CheckoutRequestID, undefined, db);
  if (isReplay) {
    await recordAuditEvent(
      {
        eventType: "payment.ignored",
        actorId: "system",
        resourceType: "payment",
        resourceId: payment.id,
        details: {
          checkoutRequestId: CheckoutRequestID,
          reason: "replay detected",
          orderId: payment.orderId,
        },
      },
      db,
    );

    return { status: "ignored" };
  }

  validateCallbackTimestamp(validated);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, payment.orderId));

  if (!order) {
    throw new Error(`Order ${payment.orderId} not found for payment`);
  }

  if (order.totalAmount !== payment.amount) {
    throw new Error(
      `Amount mismatch: payment ${payment.amount} vs order ${order.totalAmount}`,
    );
  }

  const receipt =
    extractMetadataValue(CallbackMetadata?.Item, "MpesaReceiptNumber") ??
    `TXN-${CheckoutRequestID.slice(0, 8)}`;

  const paidAmount = extractMetadataValue(CallbackMetadata?.Item, "Amount");

  if (paidAmount && parseFloat(paidAmount).toFixed(2) !== payment.amount) {
    await recordAuditEvent(
      {
        eventType: "payment.failed",
        actorId: "system",
        resourceType: "payment",
        resourceId: payment.id,
        details: {
          checkoutRequestId: CheckoutRequestID,
          reason: "amount_mismatch",
          callbackAmount: paidAmount,
          expectedAmount: payment.amount,
          orderId: payment.orderId,
        },
      },
      db,
    );

    throw new Error(
      `Amount mismatch: callback reports ${paidAmount}, expected ${payment.amount}`,
    );
  }

  const allLegs = await db
    .select()
    .from(orderLegs)
    .where(eq(orderLegs.orderId, order.id));

  if (allLegs.length === 0) {
    throw new Error(`Order ${order.id} has no legs — cannot create payouts`);
  }

  await db.transaction(async (tx: DbInstance) => {
    const receiptToUse = receipt ?? `TXN-${CheckoutRequestID.slice(0, 8)}`;

    await tx
      .update(payments)
      .set({
        status: "completed",
        mpesaReceipt: receiptToUse,
      })
      .where(eq(payments.id, payment.id));

    const nonCancelledLegs = allLegs.filter(
      (leg) => leg.status !== "cancelled",
    );

    for (const leg of nonCancelledLegs) {
      if (!leg.assignedUserId) continue;

      const [existingPayout] = await tx
        .select()
        .from(payouts)
        .where(
          and(
            eq(payouts.orderLegId, leg.id),
            eq(payouts.userId, leg.assignedUserId),
          ),
        )
        .limit(1);

      if (existingPayout) continue;

      await tx.insert(payouts).values({
        orderLegId: leg.id,
        userId: leg.assignedUserId,
        amount: leg.amount,
        status: "owed",
      });
    }
  });

  await recordAuditEvent(
    {
      eventType: "payment.completed",
      actorId: "system",
      resourceType: "payment",
      resourceId: payment.id,
      details: {
        checkoutRequestId: CheckoutRequestID,
        mpesaReceipt: receipt,
        amount: payment.amount,
        orderId: payment.orderId,
        legsCount: allLegs.length,
      },
    },
    db,
  );

  try {
    revalidatePath("/consumer");
    revalidatePath("/retailer");
  } catch {
    // revalidatePath may not be available in all environments (e.g. tests)
  }

  return { status: "completed" };
}
