/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { computeOrderStatus } from "@/lib/orders/compute-order-status";
import { legStatusEnum } from "@/db/schema";

type LegStatus = (typeof legStatusEnum)[number];

function mockDbForLegs(legs: Array<{ legType: string; status: LegStatus }>) {
  const whereBuilder = vi.fn().mockResolvedValue(
    legs.map((l, i) => ({
      id: `leg-${i}`,
      orderId: "order-1",
      legType: l.legType,
      assignedUserId: "user-1",
      status: l.status,
      amount: "25.00",
      assignedAt: l.status !== "pending" ? new Date() : null,
      completedAt: l.status === "completed" || l.status === "paid" ? new Date() : null,
    })),
  );
  const fromBuilder = vi.fn().mockReturnValue({ where: whereBuilder });
  const selectBuilder = vi.fn().mockReturnValue({ from: fromBuilder });

  return {
    db: { select: selectBuilder } as any,
    whereBuilder,
  };
}

describe("computeOrderStatus", () => {
  it("returns pending when all legs are pending", async () => {
    const m = mockDbForLegs([
      { legType: "processing", status: "pending" },
      { legType: "packing", status: "pending" },
    ]);

    const result = await computeOrderStatus({ orderId: "order-1" }, m.db);

    expect(result.overall).toBe("pending");
    expect(result.legs).toHaveLength(2);
    expect(result.legs.every((l) => l.status === "pending")).toBe(true);
  });

  it("returns in_progress when at least one leg is assigned", async () => {
    const m = mockDbForLegs([
      { legType: "processing", status: "assigned" },
      { legType: "packing", status: "pending" },
    ]);

    const result = await computeOrderStatus({ orderId: "order-1" }, m.db);

    expect(result.overall).toBe("in_progress");
  });

  it("returns in_progress when at least one leg is in_progress", async () => {
    const m = mockDbForLegs([
      { legType: "processing", status: "in_progress" },
      { legType: "packing", status: "pending" },
    ]);

    const result = await computeOrderStatus({ orderId: "order-1" }, m.db);

    expect(result.overall).toBe("in_progress");
  });

  it("returns in_progress when some legs are completed but not all paid", async () => {
    const m = mockDbForLegs([
      { legType: "processing", status: "completed" },
      { legType: "packing", status: "pending" },
    ]);

    const result = await computeOrderStatus({ orderId: "order-1" }, m.db);

    expect(result.overall).toBe("in_progress");
  });

  it("returns completed when all legs are paid", async () => {
    const m = mockDbForLegs([
      { legType: "processing", status: "paid" },
      { legType: "packing", status: "paid" },
    ]);

    const result = await computeOrderStatus({ orderId: "order-1" }, m.db);

    expect(result.overall).toBe("completed");
    expect(result.legs.every((l) => l.status === "paid")).toBe(true);
  });

  it("returns in_progress when some legs are paid but not all", async () => {
    const m = mockDbForLegs([
      { legType: "processing", status: "paid" },
      { legType: "packing", status: "completed" },
    ]);

    const result = await computeOrderStatus({ orderId: "order-1" }, m.db);

    expect(result.overall).toBe("in_progress");
  });

  it("includes leg type and status for each leg", async () => {
    const m = mockDbForLegs([
      { legType: "processing", status: "in_progress" },
      { legType: "packing", status: "completed" },
      { legType: "delivery", status: "pending" },
    ]);

    const result = await computeOrderStatus({ orderId: "order-1" }, m.db);

    expect(result.legs).toEqual([
      { legType: "processing", status: "in_progress" },
      { legType: "packing", status: "completed" },
      { legType: "delivery", status: "pending" },
    ]);
  });

  it("throws when order has no legs", async () => {
    const m = mockDbForLegs([]);

    await expect(
      computeOrderStatus({ orderId: "order-1" }, m.db),
    ).rejects.toThrow("not found or has no legs");
  });
});
