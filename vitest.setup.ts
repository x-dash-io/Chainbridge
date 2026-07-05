import { beforeAll } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.MPESA_CONSUMER_KEY = "test-consumer-key";
  process.env.MPESA_CONSUMER_SECRET = "test-consumer-secret";
  process.env.MPESA_PASSKEY = "test-passkey";
  process.env.MPESA_SHORTCODE = "174379";
});
