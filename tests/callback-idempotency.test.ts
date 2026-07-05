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
    assignedAt: null as Date | null,
    completedAt: null as Date | null,
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

  const insertValuesBuilder = vi.fn();
  const insertBuilder = vi.fn().mockReturnValue({ values: insertValuesBuilder });

  const updateSetBuilder = vi.fn();
  const updateWhereBuilder = vi.fn();
  const updateBuilder = vi.fn().mockReturnValue({ set: updateSetBuilder });
  updateSetBuilder.mockReturnValue({ where: updateWhereBuilder });

  const limitTxBuilder = vi.fn().mockResolvedValue([]);
  const whereTxBuilder = vi.fn().mockReturnValue({ limit: limitTxBuilder });
  const selectTxBuilder = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ where: whereTxBuilder }),
  });

  const insertTxBuilder = vi.fn().mockReturnValue({ values: vi.fn() });
  const updateTxBuilder = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });

  const transaction = vi.fn().mockImplementation(async (cb: any) => {
    const tx = {
      update: updateTxBuilder,
      insert: insertTxBuilder,
      select: selectTxBuilder,
    };
    return cb(tx);
  });

  return {
    db: {
      select: selectBuilder,
      transaction,
      insert: insertBuilder,
      update: updateBuilder,
    } as any,
    whereBuilder,
    updateSetBuilder,
    updateWhereBuilder,
    insertBuilder,
    insertValuesBuilder,
  };
}

describe("processCallback — idempotency", () => {
  it("returns ignored for a duplicate callback and creates only one payouts row per leg", async () => {
    const m = makeMockDb();

    m.whereBuilder
      .mockResolvedValueOnce([paymentRecord])
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(legRows)
      .mockResolvedValueOnce([{ ...paymentRecord, status: "completed" }]);

    const result1 = await processCallback(validPayload, m.db);
    expect(result1).toEqual({ status: "completed" });

    const result2 = await processCallback(validPayload, m.db);
    expect(result2).toEqual({ status: "ignored" });
  });
});
