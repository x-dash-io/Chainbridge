import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({
  getUser: mockGetUser,
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
  },
}));

vi.mock("@/db/schema", () => ({
  products: { id: "id", sellerId: "sellerId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq_clause"),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

const mockProduct = { id: "prod-1", sellerId: "user-1" };

function mockSelectProduct(result: typeof mockProduct | null) {
  const limitBuilder = vi.fn().mockResolvedValue(result ? [result] : []);
  const whereBuilder = vi.fn().mockReturnValue({ limit: limitBuilder });
  const fromBuilder = vi.fn().mockReturnValue({ where: whereBuilder });
  mockDbSelect.mockReturnValue({ from: fromBuilder });
}

describe("deleteAsset", () => {
  it("returns error when product not found", async () => {
    mockGetUser.mockResolvedValueOnce({ id: "user-1", role: "producer" });
    mockSelectProduct(null);

    const { deleteAsset } = await import("@/lib/media/delete-asset");
    const result = await deleteAsset("public-id-1", "prod-1");

    expect(result).toEqual({ error: "Product not found." });
  });

  it("returns error when user does not own product", async () => {
    mockGetUser.mockResolvedValueOnce({ id: "user-2", role: "producer" });
    mockSelectProduct(mockProduct);

    const { deleteAsset } = await import("@/lib/media/delete-asset");
    const result = await deleteAsset("public-id-1", "prod-1");

    expect(result).toEqual({ error: "You do not own this product." });
  });

  it("returns error when Cloudinary env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");

    mockGetUser.mockResolvedValueOnce({ id: "user-1", role: "producer" });
    mockSelectProduct(mockProduct);

    const { deleteAsset } = await import("@/lib/media/delete-asset");
    const result = await deleteAsset("public-id-1", "prod-1");

    expect(result).toEqual({ error: "Cloudinary is not configured." });
  });

  it("successfully deletes and updates DB", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "test-cloud");
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_API_KEY", "123456");
    vi.stubEnv("CLOUDINARY_API_SECRET", "my-secret");

    mockGetUser.mockResolvedValueOnce({ id: "user-1", role: "producer" });
    mockSelectProduct(mockProduct);

    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce({ result: "ok" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const mockWhere = vi.fn().mockResolvedValueOnce(undefined);
    const setBuilder = vi.fn().mockReturnValue({ where: mockWhere });
    mockDbUpdate.mockReturnValueOnce({ set: setBuilder });

    const { deleteAsset } = await import("@/lib/media/delete-asset");
    const result = await deleteAsset("public-id-1", "prod-1");

    expect(result).toEqual({ success: true });
  });
});
