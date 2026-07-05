/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { raiseDispute } from "@/lib/disputes/raise-dispute";
import { resolveDispute } from "@/lib/disputes/resolve-dispute";

function makeMockDb() {
  const whereBuilder = vi.fn();
  const fromBuilder = vi.fn().mockReturnValue({ where: whereBuilder });
  const selectBuilder = vi.fn().mockReturnValue({ from: fromBuilder });

  const returningBuilder = vi.fn();
  const valuesBuilder = vi.fn().mockReturnValue({ returning: returningBuilder });
  const insertBuilder = vi.fn().mockReturnValue({ values: valuesBuilder });

  const setBuilder = vi.fn();
  const updateWhereBuilder = vi.fn();
  const updateBuilder = vi.fn().mockReturnValue({ set: setBuilder });
  setBuilder.mockReturnValue({ where: updateWhereBuilder });

  return {
    db: {
      select: selectBuilder,
      insert: insertBuilder,
      update: updateBuilder,
    } as any,
    whereBuilder,
    returningBuilder,
    valuesBuilder,
    insertBuilder,
    setBuilder,
    updateWhereBuilder,
  };
}

const adminUser = { id: "admin-1", name: "Admin", email: "a@a.com", role: "admin", phone: null, verified: true, createdAt: new Date() };
const consumerUser = { id: "consumer-1", name: "Consumer", email: "c@c.com", role: "consumer", phone: null, verified: true, createdAt: new Date() };
const producerUser = { id: "producer-1", name: "Producer", email: "p@p.com", role: "producer", phone: null, verified: true, createdAt: new Date() };

const legRecord = {
  id: "leg-1",
  orderId: "order-1",
  legType: "processing",
  assignedUserId: "producer-1",
  status: "in_progress",
  amount: "50.00",
  assignedAt: new Date(),
  completedAt: null,
};

const disputeRecord = {
  id: "dispute-1",
  orderLegId: "leg-1",
  raisedByUserId: "consumer-1",
  resolvedByAdminId: null,
  reason: "Item not as described",
  status: "open",
  resolutionNotes: null,
  createdAt: new Date(),
  resolvedAt: null,
};

describe("raiseDispute", () => {
  it("allows consumer to raise a dispute", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([consumerUser])
      .mockResolvedValueOnce([legRecord])
      .mockResolvedValueOnce([]);
    m.returningBuilder.mockResolvedValue([{ id: "dispute-1" }]);

    const result = await raiseDispute(
      { legId: "leg-1", raisedByUserId: "consumer-1", reason: "Bad quality" },
      m.db,
    );

    expect(result).toEqual({ disputeId: "dispute-1", legId: "leg-1", status: "open" });
  });

  it("allows assigned user to raise a dispute", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([producerUser])
      .mockResolvedValueOnce([legRecord])
      .mockResolvedValueOnce([]);
    m.returningBuilder.mockResolvedValue([{ id: "dispute-2" }]);

    const result = await raiseDispute(
      { legId: "leg-1", raisedByUserId: "producer-1", reason: "Wrong specs" },
      m.db,
    );

    expect(result.status).toBe("open");
  });

  it("rejects dispute from unauthorized user", async () => {
    const m = makeMockDb();
    const otherUser = { ...producerUser, id: "other-user", role: "packer" };
    m.whereBuilder
      .mockResolvedValueOnce([otherUser])
      .mockResolvedValueOnce([legRecord]);

    await expect(
      raiseDispute(
        { legId: "leg-1", raisedByUserId: "other-user", reason: "Not fair" },
        m.db,
      ),
    ).rejects.toThrow("Only the order's consumer");
  });

  it("rejects duplicate open dispute for same leg", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([consumerUser])
      .mockResolvedValueOnce([legRecord])
      .mockResolvedValueOnce([disputeRecord]);

    await expect(
      raiseDispute(
        { legId: "leg-1", raisedByUserId: "consumer-1", reason: "Again" },
        m.db,
      ),
    ).rejects.toThrow("already open");
  });

  it("rejects empty reason", async () => {
    const m = makeMockDb();
    await expect(
      raiseDispute({ legId: "leg-1", raisedByUserId: "consumer-1", reason: "" }, m.db),
    ).rejects.toThrow("Reason is required");
  });
});

describe("resolveDispute", () => {
  it("allows admin to resolve a dispute with override", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([disputeRecord]);

    m.setBuilder.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "dispute-1" }]),
      }),
    });

    const result = await resolveDispute(
      { disputeId: "dispute-1", adminId: "admin-1", resolution: "override", notes: "Override approved" },
      m.db,
    );

    expect(result.resolution).toBe("resolved_override");
  });

  it("allows admin to resolve with refund_flagged", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([disputeRecord]);

    m.setBuilder.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "dispute-1" }]),
      }),
    });

    const result = await resolveDispute(
      { disputeId: "dispute-1", adminId: "admin-1", resolution: "refund_flagged", notes: "Flag for refund" },
      m.db,
    );

    expect(result.resolution).toBe("resolved_refund_flagged");
  });

  it("rejects resolution from non-admin", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([consumerUser]);

    await expect(
      resolveDispute(
        { disputeId: "dispute-1", adminId: "consumer-1", resolution: "override", notes: "Should fail" },
        m.db,
      ),
    ).rejects.toThrow("Admin authorization required");
  });

  it("rejects resolving already-resolved dispute", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([{ ...disputeRecord, status: "resolved_override" }]);

    await expect(
      resolveDispute(
        { disputeId: "dispute-1", adminId: "admin-1", resolution: "override", notes: "Again" },
        m.db,
      ),
    ).rejects.toThrow("already resolved");
  });

  it("rejects missing resolution notes", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([adminUser]);
    await expect(
      resolveDispute(
        { disputeId: "dispute-1", adminId: "admin-1", resolution: "override", notes: "" },
        m.db,
      ),
    ).rejects.toThrow("Resolution notes are required");
  });
});
