import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { orders, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { initiateStkPush } from "@/lib/mpesa/stk-push";

const StkPushRequestSchema = z.object({
  orderId: z.string().uuid(),
  phoneNumber: z.string().regex(/^2547\d{8}$/, "Must be a valid Safaricom number (2547XXXXXXXX)"),
});

const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(userId: string, maxRequests = 5, windowMs = 3600000): void {
  const now = Date.now();
  const timestamps = rateLimitStore.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }
  recent.push(now);
  rateLimitStore.set(userId, recent);
}

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

    if (appUser.role !== "consumer" && appUser.role !== "retailer") {
      return NextResponse.json(
        { error: "Only consumers and retailers can initiate payment" },
        { status: 403 },
      );
    }

    checkRateLimit(appUser.id);

    const result = await initiateStkPush({ orderId, phoneNumber });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("Rate limit exceeded")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    console.error("STK push error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
