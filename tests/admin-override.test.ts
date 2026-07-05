/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { overrideLeg } from "@/lib/admin/override-leg";
import { verifyUser } from "@/lib/admin/verify-user";

function makeMockDb() {
  const whereBuilder = vi.fn();
  const fromBuilder = vi.fn().mockReturnValue({ where: whereBuilder });
  const selectBuilder = vi.fn().mockReturnValue({ from: fromBuilder });

  const setBuilder = vi.fn();
  const updateWhereBuilder = vi.fn();
  const updateBuilder = vi.fn().mockReturnValue({ set: setBuilder });
  setBuilder.mockReturnValue({ where: updateWhereBuilder });

  const insertBuilder = vi.fn().mockReturnValue({ values: vi.fn() });

  return {
    db: {
      select: selectBuilder,
      update: updateBuilder,
      insert: insertBuilder,
    } as any,
    whereBuilder,
    setBuilder,
    updateWhereBuilder,
  };
}

const adminUser = { id: "admin-1", name: "Admin", email: "a@a.com", role: "admin", phone: null, verified: true, createdAt: new Date() };
const nonAdminUser = { id: "user-1", name: "User", email: "u@u.com", role: "consumer", phone: null, verified: true, createdAt: new Date() };

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

describe("overrideLeg", () => {
  it("allows admin to override leg status", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([legRecord]);

    const result = await overrideLeg(
      { adminId: "admin-1", legId: "leg-1", toStatus: "completed", reason: "Manual override due to system error" },
      m.db,
    );

    expect(result).toEqual({ legId: "leg-1", status: "completed", reason: "Manual override due to system error" });
    expect(m.setBuilder).toHaveBeenCalledWith({ status: "completed" });
  });

  it("rejects override from non-admin", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([nonAdminUser]);

    await expect(
      overrideLeg(
        { adminId: "user-1", legId: "leg-1", toStatus: "completed", reason: "Should fail" },
        m.db,
      ),
    ).rejects.toThrow("Admin authorization required");
  });

  it("rejects override with empty reason", async () => {
    const m = makeMockDb();
    await expect(
      overrideLeg(
        { adminId: "admin-1", legId: "leg-1", toStatus: "completed", reason: "" },
        m.db,
      ),
    ).rejects.toThrow("Reason is required");
  });

  it("rejects invalid status value", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([legRecord]);

    await expect(
      overrideLeg(
        { adminId: "admin-1", legId: "leg-1", toStatus: "invalid_status", reason: "Test" },
        m.db,
      ),
    ).rejects.toThrow("Invalid status");
  });

  it("rejects override for non-existent leg", async () => {
    const m = makeMockDb();
    m.whereBuilder
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([]);

    await expect(
      overrideLeg(
        { adminId: "admin-1", legId: "missing", toStatus: "completed", reason: "Test" },
        m.db,
      ),
    ).rejects.toThrow("not found");
  });
});

describe("verifyUser", () => {
  it("allows admin to verify a user", async () => {
    const m = makeMockDb();
    const targetUser = { ...nonAdminUser };
    m.whereBuilder
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([targetUser]);

    const result = await verifyUser(
      { adminId: "admin-1", targetUserId: "user-1", verified: true },
      m.db,
    );

    expect(result).toEqual({ userId: "user-1", verified: true });
  });

  it("prevents admin from verifying themselves", async () => {
    const m = makeMockDb();
    m.whereBuilder.mockResolvedValueOnce([adminUser]);

    await expect(
      verifyUser({ adminId: "admin-1", targetUserId: "admin-1", verified: true }, m.db),
    ).rejects.toThrow("cannot verify themselves");
  });
});
