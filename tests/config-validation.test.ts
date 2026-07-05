import { describe, it, expect, beforeEach } from "vitest";
import { validateConfig, getRequiredEnv } from "@/lib/config/validate";

describe("validateConfig", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.MPESA_CONSUMER_KEY = "test-consumer-key";
    process.env.MPESA_CONSUMER_SECRET = "test-consumer-secret";
    process.env.MPESA_PASSKEY = "test-passkey";
    process.env.MPESA_SHORTCODE = "174379";
  });

  it("passes with all required vars set", () => {
    const result = validateConfig();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("flags missing DATABASE_URL", () => {
    delete process.env.DATABASE_URL;
    const result = validateConfig();
    expect(result.valid).toBe(false);
    expect(result.missing.some((m) => m.key === "DATABASE_URL")).toBe(true);
  });

  it("flags missing MPESA env vars", () => {
    delete process.env.MPESA_CONSUMER_KEY;
    delete process.env.MPESA_CONSUMER_SECRET;
    const result = validateConfig();
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(2);
  });

  it("flags placeholder values", () => {
    process.env.MPESA_CONSUMER_KEY = "your-consumer-key";
    const result = validateConfig();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.key === "MPESA_CONSUMER_KEY")).toBe(true);
  });

  it("passes with optional vars unset", () => {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.MPESA_CALLBACK_URL;
    const result = validateConfig();
    expect(result.valid).toBe(true);
  });
});

describe("getRequiredEnv", () => {
  it("returns value when set", () => {
    process.env.TEST_VAR = "hello";
    expect(getRequiredEnv("TEST_VAR")).toBe("hello");
  });

  it("throws when variable is missing", () => {
    delete process.env.MISSING_VAR;
    expect(() => getRequiredEnv("MISSING_VAR")).toThrow("Missing required environment variable");
  });

  it("throws when variable is empty string", () => {
    process.env.EMPTY_VAR = "";
    expect(() => getRequiredEnv("EMPTY_VAR")).toThrow("Missing required environment variable");
  });
});
