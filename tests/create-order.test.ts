/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { createOrder } from "@/lib/orders/create-order";

function makeMockDb() {
  const selectWhereBuilder = vi.fn();
  const selectFromBuilder = vi.fn();
  const selectBuilder = vi.fn();
  const updateBuilder = vi.fn();
  const updateWhereBuilder = vi.fn();
  const updateSetBuilder = vi.fn();

  let returningResult: any[] = [];
  const returningBuilder = vi.fn().mockImplementation(() =>
    Promise.resolve(returningResult),
  );

  selectBuilder.mockReturnValue({ from: selectFromBuilder });
  selectFromBuilder.mockReturnValue({ where: selectWhereBuilder });
  updateBuilder.mockReturnValue({ set: updateSetBuilder });
  updateSetBuilder.mockReturnValue({ where: updateWhereBuilder });
  updateWhereBuilder.mockReturnValue({ returning: returningBuilder });
  const valuesBuilder = vi.fn().mockReturnValue({ returning: returningBuilder });
  const insertBuilder = vi.fn().mockReturnValue({ values: valuesBuilder });

  const transaction = vi.fn().mockImplementation(async (cb: any) => {
    const tx = { insert: insertBuilder, update: updateBuilder };
    return cb(tx);
  });

  function setReturning(rows: any[]) {
    returningResult = rows;
  }

  return {
    db: {
      select: selectBuilder,
      insert: vi.fn(),
      update: updateBuilder,
      transaction,
    } as any,
    selectWhereBuilder,
    insertBuilder,
    valuesBuilder,
    returningBuilder,
    updateBuilder,
    updateSetBuilder,
    updateWhereBuilder,
    setReturning,
  };
}

const mockProduct = {
  id: "prod-1",
  sellerId: "producer-1",
  sellerRole: "producer",
  name: "Fresh Maize",
  pricePerUnit: "100.00",
  quantityAvailable: 50,
  status: "active",
};

describe("createOrder", () => {
  it("creates an order with a raw_supply leg and no optional legs", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProduct]);
    m.setReturning([{ id: "order-1" }]);

    const result = await createOrder(
      {
        consumerId: "consumer-1",
        productId: "prod-1",
        quantity: 2,
        legs: {},
      },
      m.db,
    );

    expect(result.orderId).toBe("order-1");
    expect(result.totalAmount).toBe("200.00");
  });

  it("creates legs for optional processing, packing, and delivery", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProduct]);
    m.setReturning([{ id: "order-1" }]);

    const result = await createOrder(
      {
        consumerId: "consumer-1",
        productId: "prod-1",
        quantity: 1,
        legs: {
          processing: { processorId: "processor-1", amount: 30 },
          packing: { packerId: "packer-1", amount: 15 },
          delivery: { agentId: "agent-1", amount: 25 },
        },
      },
      m.db,
    );

    expect(result.orderId).toBe("order-1");
    expect(result.totalAmount).toBe("170.00");
  });

  it("creates both raw_supply and optional legs with correct data", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProduct]);
    m.setReturning([{ id: "order-1" }]);

    const result = await createOrder(
      {
        consumerId: "consumer-1",
        productId: "prod-1",
        quantity: 3,
        legs: {
          processing: { processorId: "processor-1", amount: 30 },
        },
      },
      m.db,
    );

    expect(result.orderId).toBe("order-1");
    expect(result.totalAmount).toBe("330.00");
  });

  it("reduces available quantity when an order is created", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProduct]);
    m.setReturning([{ id: "order-1" }]);

    await createOrder(
      {
        consumerId: "consumer-1",
        productId: "prod-1",
        quantity: 2,
        legs: {},
      },
      m.db,
    );

    expect(m.updateBuilder).toHaveBeenCalled();
    expect(m.updateSetBuilder).toHaveBeenCalled();
    const [payload] = m.updateSetBuilder.mock.calls[0] ?? [];
    expect(payload).toHaveProperty("quantityAvailable");
  });

  it("throws if product not found", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([]);

    await expect(
      createOrder(
        {
          consumerId: "consumer-1",
          productId: "missing-prod",
          quantity: 1,
          legs: {},
        },
        m.db,
      ),
    ).rejects.toThrow("not found");
  });

  it("throws if quantity exceeds available", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProduct]);

    await expect(
      createOrder(
        {
          consumerId: "consumer-1",
          productId: "prod-1",
          quantity: 999,
          legs: {},
        },
        m.db,
      ),
    ).rejects.toThrow("quantity");
  });

  it("inserts raw_supply leg with seller as assigned user", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProduct]);
    m.setReturning([{ id: "order-1" }]);

    await createOrder(
      {
        consumerId: "consumer-1",
        productId: "prod-1",
        quantity: 1,
        legs: {},
      },
      m.db,
    );

    const legValues = m.valuesBuilder.mock.calls.slice(1);
    const rawSupply = legValues.find(
      (v: any) => v[0]?.legType === "raw_supply",
    );
    expect(rawSupply).toBeDefined();
    expect(rawSupply![0].assignedUserId).toBe("producer-1");
  });

  it("inserts leg rows for each optional service", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProduct]);
    m.setReturning([{ id: "order-1" }]);

    await createOrder(
      {
        consumerId: "consumer-1",
        productId: "prod-1",
        quantity: 1,
        legs: {
          processing: { processorId: "processor-1", amount: 30 },
          delivery: { agentId: "agent-1", amount: 25 },
        },
      },
      m.db,
    );

    const legValues = m.valuesBuilder.mock.calls.slice(1);
    expect(legValues).toHaveLength(3);
    expect(legValues[0][0].legType).toBe("raw_supply");
    expect(legValues[1][0].legType).toBe("processing");
    expect(legValues[2][0].legType).toBe("delivery");
  });
});
