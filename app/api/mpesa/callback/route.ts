import { NextRequest, NextResponse } from "next/server";
import { processCallback } from "@/lib/mpesa/verify-callback";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Invalid JSON" },
        { status: 200 },
      );
    }

    const result = await processCallback(body);

    if (result.status === "completed") {
      return NextResponse.json(
        { ResultCode: 0, ResultDesc: "Success" },
        { status: 200 },
      );
    }

    if (result.status === "ignored") {
      return NextResponse.json(
        { ResultCode: 0, ResultDesc: "Already processed" },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Payment failed" },
      { status: 200 },
    );
  } catch (err) {
    console.error("Callback processing error:", err);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Internal error" },
      { status: 200 },
    );
  }
}
