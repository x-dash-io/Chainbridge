import { NextRequest, NextResponse } from "next/server";
import { processCallback, verifyCallbackOrigin } from "@/lib/mpesa/verify-callback";
import { recordAuditEvent } from "@/lib/audit/audit-log";

export async function POST(request: NextRequest) {
  try {
    verifyCallbackOrigin(request);

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
    const message = err instanceof Error ? err.message : "Internal error";

    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: message,
      },
      { status: 200 },
    );
  }
}
