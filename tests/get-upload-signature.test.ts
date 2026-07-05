import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getUser: mockGetUser,
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getUploadSignature", () => {
  it("returns error when Cloudinary env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");

    mockGetUser.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test",
      role: "producer",
      phone: null,
      verified: true,
    });

    const { getUploadSignature } = await import("@/lib/media/get-upload-signature");
    const result = await getUploadSignature();
    expect(result).toEqual({ error: "Cloudinary is not configured." });
  });

  it("returns error when rate limit exceeded", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "test-cloud");
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_API_KEY", "123456");
    vi.stubEnv("CLOUDINARY_API_SECRET", "my-secret");

    mockGetUser.mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test",
      role: "producer",
      phone: null,
      verified: true,
    });

    const { getUploadSignature } = await import("@/lib/media/get-upload-signature");

    for (let i = 0; i < 19; i++) {
      const res = await getUploadSignature();
      expect(("error" in res)).toBe(false);
    }

    const rateLimited = await getUploadSignature();
    expect(rateLimited).toEqual({
      error: "Rate limit exceeded. Maximum 20 uploads per hour.",
    });
  });
});
