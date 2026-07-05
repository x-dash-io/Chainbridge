/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { transitionLeg } from "@/lib/orders/transition-leg";
import { legStatusEnum } from "@/db/schema";

type LegStatus = (typeof legStatusEnum)[number];

function makeMockDb() {
  const whereBuilder = vi.fn();
  const setBuilder = vi.fn();
  const fromBuilder = vi.fn();
  const selectBuilder = vi.fn();
  const updateBuilder = vi.fn();
  const insertBuilder = vi.fn();

  selectBuilder.mockReturnValue({ from: fromBuilder });
  fromBuilder.mockReturnValue({ where: whereBuilder });
  updateBuilder.mockReturnValue({ set: setBuilder });
  setBuilder.mockReturnValue({ where: whereBuilder });

  return {
    db: {
      select: selectBuilder,
      update: updateBuilder,
      insert: insertBuilder,
    },
    whereBuilder,
    setBuilder,
    fromBuilder,
    selectBuilder,
  };
}

function makeLeg(overrides: Partial<{
  id: string;
  orderId: string;
  legType: string;
  assignedUserId: string | null;
  status: LegStatus;
  amount: string;
  assignedAt: Date | null;
  completedAt: Date | null;
}> = {}) {
  return {
    id: "leg-1",
    orderId: "order-1",
    legType: "processing",
    assignedUserId: "user-1",
    status: "pending" as LegStatus,
    amount: "50.00",
    assignedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("transitionLeg — legal transitions", () => {
  it("allows pending → assigned", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([makeLeg()]);

    const result = await transitionLeg(
      { legId: "leg-1", actorUserId: "user-1", toStatus: "assigned" },
      m.db as any,
    );

    expect(result).toEqual({ legId: "leg-1", status: "assigned" });
    expect(m.setBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ status: "assigned", assignedAt: expect.any(Date) }),
    );
  });

  it("allows assigned → in_progress", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([
      makeLeg({ status: "assigned", assignedAt: new Date() }),
    ]);

    const result = await transitionLeg(
      { legId: "leg-1", actorUserId: "user-1", toStatus: "in_progress" },
      m.db as any,
    );

    expect(result).toEqual({ legId: "leg-1", status: "in_progress" });
    expect(m.setBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_progress" }),
    );
  });

  it("allows in_progress → completed", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([
      makeLeg({ status: "in_progress", assignedAt: new Date() }),
    ]);

    const result = await transitionLeg(
      { legId: "leg-1", actorUserId: "user-1", toStatus: "completed" },
      m.db as any,
    );

    expect(result).toEqual({ legId: "leg-1", status: "completed" });
    expect(m.setBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", completedAt: expect.any(Date) }),
    );
  });

  it("allows completed → paid", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([
      makeLeg({ status: "completed", assignedAt: new Date(), completedAt: new Date() }),
    ]);

    const result = await transitionLeg(
      { legId: "leg-1", actorUserId: "user-1", toStatus: "paid" },
      m.db as any,
    );

    expect(result).toEqual({ legId: "leg-1", status: "paid" });
    expect(m.setBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    );
  });
});

describe("transitionLeg — illegal transitions", () => {
  const illegalTransitions: [LegStatus, LegStatus][] = [
    ["pending", "in_progress"],
    ["pending", "completed"],
    ["pending", "paid"],
    ["assigned", "pending"],
    ["assigned", "completed"],
    ["assigned", "paid"],
    ["in_progress", "pending"],
    ["in_progress", "assigned"],
    ["in_progress", "paid"],
    ["completed", "pending"],
    ["completed", "assigned"],
    ["completed", "in_progress"],
    ["paid", "pending"],
    ["paid", "assigned"],
    ["paid", "in_progress"],
    ["paid", "completed"],
  ];

  for (const [from, to] of illegalTransitions) {
    it(`rejects ${from} → ${to}`, async () => {
      const m = makeMockDb();
      m.whereBuilder.mockResolvedValueOnce([
        makeLeg({ status: from as LegStatus, assignedAt: from !== "pending" ? new Date() : null, completedAt: from === "completed" || from === "paid" ? new Date() : null }),
      ]);

      await expect(
        transitionLeg(
          { legId: "leg-1", actorUserId: "user-1", toStatus: to },
          m.db as any,
        ),
      ).rejects.toThrow("Illegal transition");
    });
  }
});

describe("transitionLeg — authorization", () => {
  it("rejects transition when actor is not the assigned user", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([makeLeg()]);

    await expect(
      transitionLeg(
        { legId: "leg-1", actorUserId: "other-user", toStatus: "assigned" },
        m.db as any,
      ),
    ).rejects.toThrow("not authorized");
  });

  it("rejects transition for non-existent leg", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([]);

    await expect(
      transitionLeg(
        { legId: "missing-leg", actorUserId: "user-1", toStatus: "assigned" },
        m.db as any,
      ),
    ).rejects.toThrow("not found");
  });
});
