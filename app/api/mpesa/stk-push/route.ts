import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { orders, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { initiateStkPush } from "@/lib/mpesa/stk-push";
import { checkRateLimit } from "@/lib/rate-limit/shared";
import { recordAuditEvent } from "@/lib/audit/audit-log";

const StkPushRequestSchema = z.object({
  orderId: z.string().uuid(),
  phoneNumber: z.string().regex(/^2547\d{8}$/, "Must be a valid Safaricom number (2547XXXXXXXX)"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [appUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (appUser.role !== "consumer" && appUser.role !== "retailer") {
      return NextResponse.json(
        { error: "Only consumers and retailers can initiate payment" },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = StkPushRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { orderId, phoneNumber } = parsed.data;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.consumerId !== appUser.id) {
      return NextResponse.json(
        { error: "You are not authorized to pay for this order" },
        { status: 403 },
      );
    }

    if (!checkRateLimit(`stk-push:${appUser.id}`, "stk-push")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 5 attempts per hour." },
        { status: 429 },
      );
    }

    const result = await initiateStkPush({ orderId, phoneNumber, actorUserId: appUser.id });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("STK push error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
