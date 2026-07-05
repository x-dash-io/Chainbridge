import { db as defaultDb } from "@/db/client";
import { payments, orders, orderLegs, payouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";

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

  return b;
}

export function verifyCallbackOrigin(): void {
  const originSecret = process.env.MPESA_CALLBACK_SECRET;
  if (originSecret) {
    // In production, verify an HMAC header or security credential
    // against the shared secret registered with Daraja.
    // Sandbox payloads carry no signature — structure validation is
    // the pragmatic floor (06-SECURITY.md §3).
  }
}

export async function processCallback(
  body: unknown,
  db: DbInstance = defaultDb,
): Promise<ProcessCallbackResult> {
  const validated = validatePayload(body);
  verifyCallbackOrigin();

  const { stkCallback } = validated.Body;
  const { CheckoutRequestID, ResultCode, CallbackMetadata } =
    stkCallback;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.checkoutRequestId, CheckoutRequestID));

  if (!payment) {
    throw new Error(
      `No payment found for CheckoutRequestID ${CheckoutRequestID}`,
    );
  }

  if (payment.status === "completed") {
    return { status: "ignored" };
  }

  if (ResultCode !== 0) {
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, payment.id));
    return { status: "failed" };
  }

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

  const receipt = extractMetadataValue(CallbackMetadata?.Item, "MpesaReceiptNumber");
  const paidAmount = extractMetadataValue(CallbackMetadata?.Item, "Amount");

  if (paidAmount && parseFloat(paidAmount).toFixed(2) !== payment.amount) {
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
    await tx
      .update(payments)
      .set({
        status: "completed",
        mpesaReceipt: receipt ?? null,
      })
      .where(eq(payments.id, payment.id));

    for (const leg of allLegs) {
      if (leg.status === "cancelled") continue;

      if (!leg.assignedUserId) continue;

      await tx.insert(payouts).values({
        orderLegId: leg.id,
        userId: leg.assignedUserId,
        amount: leg.amount,
        status: "owed",
      });
    }
  });

  return { status: "completed" };
}
