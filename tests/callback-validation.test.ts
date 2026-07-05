/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processCallback } from "@/lib/mpesa/verify-callback";

let callId = 0;

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  callId++;
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: `mreq-${callId}`,
        CheckoutRequestID: `crq-${callId}`,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 100 },
            { Name: "MpesaReceiptNumber", Value: `RCPT${callId}` },
            { Name: "PhoneNumber", Value: 254712345678 },
          ],
        },
        ...overrides,
      },
    },
  };
}

function makePaymentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-1",
    orderId: "order-1",
    checkoutRequestId: "crq-1",
    amount: "100.00",
    status: "initiated",
    mpesaReceipt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

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
  const limitBuilder = vi.fn().mockReturnValue(Promise.resolve([]));
  const whereWithLimit = vi.fn().mockReturnValue({ limit: limitBuilder });

  const fromBuilder = vi.fn().mockReturnValue({ where: whereBuilder });
  const selectBuilder = vi.fn().mockReturnValue({ from: fromBuilder });

  const insertValuesBuilder = vi.fn();
  const insertBuilder = vi.fn().mockReturnValue({ values: insertValuesBuilder });

  const updateSetBuilder = vi.fn();
  const updateWhereBuilder = vi.fn();
  const updateBuilder = vi.fn().mockReturnValue({ set: updateSetBuilder });
  updateSetBuilder.mockReturnValue({ where: updateWhereBuilder });

  const selectTxBuilder = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ where: whereWithLimit }),
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
    insertBuilder,
  };
}

describe("processCallback — payload validation", () => {
  beforeEach(() => {
    callId = 0;
  });

  it("rejects missing Body", async () => {
    const m = makeMockDb();
    await expect(processCallback({}, m.db)).rejects.toThrow("missing Body");
  });

  it("rejects missing stkCallback", async () => {
    const m = makeMockDb();
    await expect(
      processCallback({ Body: {} }, m.db),
    ).rejects.toThrow("missing stkCallback");
  });

  it("rejects missing CheckoutRequestID", async () => {
    const m = makeMockDb();
    await expect(
      processCallback({
        Body: { stkCallback: { ResultCode: 0 } },
      }, m.db),
    ).rejects.toThrow("missing CheckoutRequestID");
  });

  it("rejects null body", async () => {
    const m = makeMockDb();
    await expect(processCallback(null, m.db)).rejects.toThrow("missing Body");
  });

  it("rejects non-object body", async () => {
    const m = makeMockDb();
    await expect(processCallback("string", m.db)).rejects.toThrow("missing Body");
  });
});

describe("processCallback — failure cases", () => {
  it("handles ResultCode !== 0 as failed payment", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([makePaymentRecord({ checkoutRequestId: "crq-fail-1" })]);

    const result = await processCallback(
      makeValidPayload({ ResultCode: 1, ResultDesc: "Transaction cancelled" }),
      m.db,
    );

    expect(result).toEqual({ status: "failed" });
  });

  it("throws when payment is not found", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([]);

    await expect(
      processCallback(makeValidPayload(), m.db),
    ).rejects.toThrow("No payment found");
  });

  it("throws when order total does not match payment amount", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([makePaymentRecord({ checkoutRequestId: "crq-amt-1", amount: "50.00" })])
      .mockResolvedValueOnce([orderRecord]);

    await expect(
      processCallback(makeValidPayload(), m.db),
    ).rejects.toThrow("Amount mismatch");
  });
});

describe("processCallback — payout deduplication", () => {
  it("skips legs with cancelled status", async () => {
    const m = makeMockDb();
    const legsWithCancelled = legRows.map((l) =>
      l.id === "leg-2" ? { ...l, status: "cancelled" } : l,
    );

    m.whereBuilder
      .mockResolvedValueOnce([makePaymentRecord({ checkoutRequestId: "crq-canc-1" })])
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(legsWithCancelled);

    const result = await processCallback(makeValidPayload(), m.db);
    expect(result).toEqual({ status: "completed" });
  });

  it("skips legs with no assigned user", async () => {
    const m = makeMockDb();
    const legsWithNoAssign = legRows.map((l) =>
      l.id === "leg-2" ? { ...l, assignedUserId: null } : l,
    );

    m.whereBuilder
      .mockResolvedValueOnce([makePaymentRecord({ checkoutRequestId: "crq-noassign-1" })])
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(legsWithNoAssign);

    const result = await processCallback(makeValidPayload(), m.db);
    expect(result).toEqual({ status: "completed" });
  });

  it("does not create duplicate payouts for same leg", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([makePaymentRecord({ checkoutRequestId: "crq-dedup-1" })])
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(legRows);

    const limitBuilder = vi.fn().mockResolvedValue([
      { id: "existing-payout-1", orderLegId: "leg-1", userId: "producer-1", amount: "60.00", status: "owed" },
    ]);
    const whereWithLimit = vi.fn().mockReturnValue({ limit: limitBuilder });

    const selectTxBuilder = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: whereWithLimit }),
    });

    const transaction = vi.fn().mockImplementation(async (cb: any) => {
      const tx = {
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
        insert: vi.fn().mockReturnValue({ values: vi.fn() }),
        select: selectTxBuilder,
      };
      return cb(tx);
    });

    m.db.transaction = transaction;

    await processCallback(makeValidPayload(), m.db);
  });
});
