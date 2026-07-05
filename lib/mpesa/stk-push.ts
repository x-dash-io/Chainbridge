import { db as defaultDb } from "@/db/client";
import { payments, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/lib/db-types";
import { getRequiredEnv, getOptionalEnv } from "@/lib/config/validate";
import { recordAuditEvent } from "@/lib/audit/audit-log";

export type StkPushInput = {
  orderId: string;
  phoneNumber: string;
  actorUserId?: string;
};

export type StkPushResult = {
  checkoutRequestId: string;
  status: "initiated";
};

function formatTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}${M}${d}${h}${m}${s}`;
}

function generatePassword(shortCode: string, passkey: string, timestamp: string): string {
  const raw = shortCode + passkey + timestamp;
  return Buffer.from(raw).toString("base64");
}

async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
): Promise<string> {
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${credentials}` } },
  );
  if (!res.ok) {
    throw new Error(`Daraja auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function sendStkPush(
  accessToken: string,
  amount: string,
  phoneNumber: string,
  shortCode: string,
  passkey: string,
  callbackUrl: string,
  accountRef: string,
): Promise<{ CheckoutRequestID: string; ResponseCode: string; ResponseDescription: string }> {
  const timestamp = formatTimestamp();
  const password = generatePassword(shortCode, passkey, timestamp);

  const body = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(parseFloat(amount)).toString(),
    PartyA: phoneNumber,
    PartyB: shortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: accountRef.slice(0, 12),
    TransactionDesc: "Order Payment",
  };

  const res = await fetch(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    throw new Error(`Daraja STK push failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function initiateStkPush(
  input: StkPushInput,
  db: DbInstance = defaultDb,
): Promise<StkPushResult> {
  const { orderId, phoneNumber } = input;

  const consumerKey = getRequiredEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = getRequiredEnv("MPESA_CONSUMER_SECRET");
  const passkey = getRequiredEnv("MPESA_PASSKEY");
  const shortCode = getRequiredEnv("MPESA_SHORTCODE");
  const callbackUrl = getOptionalEnv("MPESA_CALLBACK_URL");
  if (!callbackUrl) {
    throw new Error("MPESA_CALLBACK_URL is required. Set it to a publicly reachable HTTPS URL (e.g. ngrok)");
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const accessToken = await getAccessToken(consumerKey, consumerSecret);
  const darajaRes = await sendStkPush(
    accessToken,
    order.totalAmount,
    phoneNumber,
    shortCode,
    passkey,
    callbackUrl,
    orderId,
  );

  if (darajaRes.ResponseCode !== "0") {
    throw new Error(`STK push rejected by Daraja: ${darajaRes.ResponseDescription}`);
  }

  await db.insert(payments).values({
    orderId,
    checkoutRequestId: darajaRes.CheckoutRequestID,
    amount: order.totalAmount,
    status: "initiated",
  });

  await recordAuditEvent(
    {
      eventType: "payment.initiated",
      actorId: input.actorUserId ?? input.orderId,
      resourceType: "payment",
      resourceId: darajaRes.CheckoutRequestID,
      details: {
        orderId,
        amount: order.totalAmount,
        checkoutRequestId: darajaRes.CheckoutRequestID,
      },
    },
    db,
  );

  return {
    checkoutRequestId: darajaRes.CheckoutRequestID,
    status: "initiated",
  };
}
