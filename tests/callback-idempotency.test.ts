/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { processCallback } from "@/lib/mpesa/verify-callback";

const validPayload = {
  Body: {
    stkCallback: {
      MerchantRequestID: "mreq-1",
      CheckoutRequestID: "crq-1",
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: 100 },
          { Name: "MpesaReceiptNumber", Value: "RCPT123" },
          { Name: "PhoneNumber", Value: 254712345678 },
        ],
      },
    },
  },
};

const paymentRecord = {
  id: "pay-1",
  orderId: "order-1",
  checkoutRequestId: "crq-1",
  amount: "100.00",
  status: "initiated",
  mpesaReceipt: null,
  createdAt: new Date(),
};

const orderRecord = {
  id: "order-1",
  consumerId: "consumer-1",
  productId: "prod-1",
  quantity: 1,
  totalAmount: "100.00",
  createdAt: new Date(),
};

const legRows = [
  {
    id: "leg-1",
    orderId: "order-1",
    legType: "raw_supply",
    assignedUserId: "producer-1",
    status: "pending",
    amount: "60.00",
    assignedAt: null,
    completedAt: null,
  },
  {
    id: "leg-2",
    orderId: "order-1",
    legType: "processing",
    assignedUserId: "processor-1",
    status: "pending",
    amount: "40.00",
    assignedAt: null,
    completedAt: null,
  },
];

function makeMockDb() {
  const whereBuilder = vi.fn();
  const fromBuilder = vi.fn().mockReturnValue({ where: whereBuilder });
  const selectBuilder = vi.fn().mockReturnValue({ from: fromBuilder });

  const payoutValuesBuilder = vi.fn();
  const insertPayoutsBuilder = vi.fn().mockReturnValue({ values: payoutValuesBuilder });

  const updateWhereBuilder = vi.fn();
  const setPaymentsBuilder = vi.fn().mockReturnValue({ where: updateWhereBuilder });
  const updatePaymentsBuilder = vi.fn().mockReturnValue({ set: setPaymentsBuilder });

  const transaction = vi.fn().mockImplementation(async (cb: any) => {
    const tx = {
      update: updatePaymentsBuilder,
      insert: insertPayoutsBuilder,
    };
    return cb(tx);
  });

  return {
    db: {
      select: selectBuilder,
      transaction,
    } as any,
    whereBuilder,
    insertPayoutsBuilder,
    payoutValuesBuilder,
    updatePaymentsBuilder,
    setPaymentsBuilder,
    updateWhereBuilder,
  };
}

describe("processCallback — idempotency", () => {
  it("returns ignored for a duplicate callback and creates only one payouts row per leg", async () => {
    const m = makeMockDb();

    m.whereBuilder
      // First call queries
      .mockResolvedValueOnce([paymentRecord])          // payments lookup
      .mockResolvedValueOnce([orderRecord])             // orders lookup
      .mockResolvedValueOnce(legRows)                   // legs lookup
      // Second call query
      .mockResolvedValueOnce([{ ...paymentRecord, status: "completed" }]); // payments lookup (already completed)

    const result1 = await processCallback(validPayload, m.db);
    expect(result1).toEqual({ status: "completed" });

    const result2 = await processCallback(validPayload, m.db);
    expect(result2).toEqual({ status: "ignored" });

    expect(m.insertPayoutsBuilder).toHaveBeenCalledTimes(legRows.length);
    expect(m.payoutValuesBuilder).toHaveBeenCalledTimes(legRows.length);
  });
});
