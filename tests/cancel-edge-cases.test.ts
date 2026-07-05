/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { cancelOrder } from "@/lib/orders/cancel-order";

function makeMockDb() {
  const whereBuilder = vi.fn();
  const fromBuilder = vi.fn().mockReturnValue({ where: whereBuilder });
  const selectBuilder = vi.fn().mockReturnValue({ from: fromBuilder });

  const setBuilder = vi.fn();
  const updateWhereBuilder = vi.fn();
  const updateBuilder = vi.fn().mockReturnValue({ set: setBuilder });
  setBuilder.mockReturnValue({ where: updateWhereBuilder });

  const deleteWhereBuilder = vi.fn();
  const deleteBuilder = vi.fn().mockReturnValue({ where: deleteWhereBuilder });

  const selectTxBuilder = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  });

  const transaction = vi.fn().mockImplementation(async (cb: any) => {
    const tx = {
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
      delete: deleteBuilder,
      select: selectTxBuilder,
    };
    return cb(tx);
  });

  const insertValuesBuilder = vi.fn();
  const insertBuilder = vi.fn().mockReturnValue({ values: insertValuesBuilder });

  return {
    db: {
      select: selectBuilder,
      transaction,
      insert: insertBuilder,
    } as any,
    whereBuilder,
    updateBuilder,
    setBuilder,
    updateWhereBuilder,
    deleteBuilder,
    selectTxBuilder,
    insertBuilder,
  };
}

const orderRecord = {
  id: "order-1",
  consumerId: "consumer-1",
  productId: "prod-1",
  quantity: 2,
  totalAmount: "100.00",
  createdAt: new Date(),
};

const pendingLegs = [
  { id: "leg-1", orderId: "order-1", legType: "raw_supply", assignedUserId: "producer-1", status: "pending", amount: "60.00", assignedAt: null, completedAt: null },
  { id: "leg-2", orderId: "order-1", legType: "processing", assignedUserId: "processor-1", status: "pending", amount: "40.00", assignedAt: null, completedAt: null },
];

describe("cancelOrder — edge cases", () => {
  it("rejects cancellation by non-owner", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([orderRecord]);

    await expect(
      cancelOrder({ orderId: "order-1", actorUserId: "other-user" }, m.db),
    ).rejects.toThrow("Only the order owner");
  });

  it("rejects cancellation of non-existent order", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([]);

    await expect(
      cancelOrder({ orderId: "missing", actorUserId: "consumer-1" }, m.db),
    ).rejects.toThrow("not found");
  });

  it("rejects cancellation when no legs exist", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce([]);

    await expect(
      cancelOrder({ orderId: "order-1", actorUserId: "consumer-1" }, m.db),
    ).rejects.toThrow("has no legs");
  });

  it("rejects cancellation when a leg is in_progress", async () => {
    const m = makeMockDb();
    const inProgressLegs = pendingLegs.map((l) =>
      l.id === "leg-2" ? { ...l, status: "in_progress" } : l,
    );
    m.whereBuilder
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(inProgressLegs);

    await expect(
      cancelOrder({ orderId: "order-1", actorUserId: "consumer-1" }, m.db),
    ).rejects.toThrow("Cannot cancel");
  });

  it("rejects cancellation when a leg is completed", async () => {
    const m = makeMockDb();
    const completedLegs = pendingLegs.map((l) =>
      l.id === "leg-2" ? { ...l, status: "completed" } : l,
    );
    m.whereBuilder
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(completedLegs);

    await expect(
      cancelOrder({ orderId: "order-1", actorUserId: "consumer-1" }, m.db),
    ).rejects.toThrow("Cannot cancel");
  });

  it("cancels successfully with only pending/assigned legs", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(pendingLegs)
      .mockResolvedValueOnce([]);

    const result = await cancelOrder({ orderId: "order-1", actorUserId: "consumer-1" }, m.db);
    expect(result).toEqual({ orderId: "order-1", cancelled: true });
  });

  it("cancels partial legs when some are already cancelled", async () => {
    const m = makeMockDb();
    const mixedLegs = pendingLegs.map((l) =>
      l.id === "leg-2" ? { ...l, status: "cancelled" } : l,
    );
    m.whereBuilder
      .mockResolvedValueOnce([orderRecord])
      .mockResolvedValueOnce(mixedLegs)
      .mockResolvedValueOnce([]);

    const result = await cancelOrder({ orderId: "order-1", actorUserId: "consumer-1" }, m.db);
    expect(result).toEqual({ orderId: "order-1", cancelled: true });
  });
});
