/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { createResaleListing } from "@/lib/products/create-resale-listing";

function makeMockDb() {
  const selectWhereBuilder = vi.fn();
  const selectFromBuilder = vi.fn();
  const selectBuilder = vi.fn();

  selectBuilder.mockReturnValue({ from: selectFromBuilder });
  selectFromBuilder.mockReturnValue({ where: selectWhereBuilder });

  let returningResult: any[] = [];
  const returningBuilder = vi.fn().mockImplementation(() =>
    Promise.resolve(returningResult),
  );
  const valuesBuilder = vi.fn().mockReturnValue({ returning: returningBuilder });
  const insertBuilder = vi.fn().mockReturnValue({ values: valuesBuilder });

  function setReturning(rows: any[]) {
    returningResult = rows;
  }

  return {
    db: {
      select: selectBuilder,
      insert: insertBuilder,
    } as any,
    selectWhereBuilder,
    selectFromBuilder,
    insertBuilder,
    valuesBuilder,
    returningBuilder,
    setReturning,
  };
}

const mockRetailer = {
  id: "retailer-1",
  name: "Retailer Shop",
  email: "retailer@test.com",
  role: "retailer",
  verified: true,
};

const mockProducer = {
  id: "producer-1",
  name: "Farmer Kamau",
  email: "kamau@test.com",
  role: "producer",
  verified: true,
};

const mockOrder = {
  id: "order-1",
  consumerId: "retailer-1",
  productId: "prod-1",
  quantity: 5,
  totalAmount: "500.00",
};

const mockLegsCompleted = [
  { id: "leg-1", orderId: "order-1", legType: "raw_supply", status: "completed" },
  { id: "leg-2", orderId: "order-1", legType: "delivery", status: "paid" },
];

const mockLegsPending = [
  { id: "leg-1", orderId: "order-1", legType: "raw_supply", status: "completed" },
  { id: "leg-2", orderId: "order-1", legType: "delivery", status: "in_progress" },
];

describe("createResaleListing", () => {
  it("throws if user does not exist", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([]); // No user

    await expect(
      createResaleListing(
        {
          retailerId: "missing-user",
          name: "Test Product",
          category: "Grains",
          unit: "kg",
          pricePerUnit: 100,
          quantityAvailable: 10,
          externallySourced: true,
        },
        m.db,
      ),
    ).rejects.toThrow("not found");
  });

  it("throws if user is not a retailer", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockProducer]); // Producer user

    await expect(
      createResaleListing(
        {
          retailerId: "producer-1",
          name: "Test Product",
          category: "Grains",
          unit: "kg",
          pricePerUnit: 100,
          quantityAvailable: 10,
          externallySourced: true,
        },
        m.db,
      ),
    ).rejects.toThrow("Only retailers");
  });

  it("throws if not externally sourced and sourceOrderId is missing", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockRetailer]);

    await expect(
      createResaleListing(
        {
          retailerId: "retailer-1",
          name: "Test Product",
          category: "Grains",
          unit: "kg",
          pricePerUnit: 100,
          quantityAvailable: 10,
          externallySourced: false, // sourceOrderId missing
        },
        m.db,
      ),
    ).rejects.toThrow("source order ID is required");
  });

  it("throws if source order does not exist", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder
      .mockResolvedValueOnce([mockRetailer]) // User check
      .mockResolvedValueOnce([]); // Order check empty

    await expect(
      createResaleListing(
        {
          retailerId: "retailer-1",
          sourceOrderId: "order-1",
          name: "Test Product",
          category: "Grains",
          unit: "kg",
          pricePerUnit: 100,
          quantityAvailable: 10,
        },
        m.db,
      ),
    ).rejects.toThrow("order-1 not found");
  });

  it("throws if source order has no legs", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder
      .mockResolvedValueOnce([mockRetailer]) // User check
      .mockResolvedValueOnce([mockOrder]) // Order check
      .mockResolvedValueOnce([]); // Legs check empty

    await expect(
      createResaleListing(
        {
          retailerId: "retailer-1",
          sourceOrderId: "order-1",
          name: "Test Product",
          category: "Grains",
          unit: "kg",
          pricePerUnit: 100,
          quantityAvailable: 10,
        },
        m.db,
      ),
    ).rejects.toThrow("No legs found for source order");
  });

  it("throws if some legs of the source order are not completed", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder
      .mockResolvedValueOnce([mockRetailer]) // User check
      .mockResolvedValueOnce([mockOrder]) // Order check
      .mockResolvedValueOnce(mockLegsPending); // Legs has "in_progress"

    await expect(
      createResaleListing(
        {
          retailerId: "retailer-1",
          sourceOrderId: "order-1",
          name: "Test Product",
          category: "Grains",
          unit: "kg",
          pricePerUnit: 100,
          quantityAvailable: 10,
        },
        m.db,
      ),
    ).rejects.toThrow("must be completed");
  });

  it("succeeds if source order legs are all completed or paid", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder
      .mockResolvedValueOnce([mockRetailer]) // User check
      .mockResolvedValueOnce([mockOrder]) // Order check
      .mockResolvedValueOnce(mockLegsCompleted); // Legs are completed/paid
    m.setReturning([{ id: "new-prod-1" }]);

    const result = await createResaleListing(
      {
        retailerId: "retailer-1",
        sourceOrderId: "order-1",
        name: "Premium Maize Flour",
        category: "Grains",
        unit: "kg",
        pricePerUnit: 120,
        quantityAvailable: 5,
      },
      m.db,
    );

    expect(result.productId).toBe("new-prod-1");
  });

  it("succeeds if externally sourced is true (without sourceOrderId)", async () => {
    const m = makeMockDb();
    m.selectWhereBuilder.mockResolvedValueOnce([mockRetailer]); // User check
    m.setReturning([{ id: "new-prod-2" }]);

    const result = await createResaleListing(
      {
        retailerId: "retailer-1",
        name: "Imported Wheat Flour",
        category: "Grains",
        unit: "kg",
        pricePerUnit: 150,
        quantityAvailable: 20,
        externallySourced: true,
      },
      m.db,
    );

    expect(result.productId).toBe("new-prod-2");
  });
});
