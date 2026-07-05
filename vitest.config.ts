import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      MPESA_CONSUMER_KEY: "test-consumer-key",
      MPESA_CONSUMER_SECRET: "test-consumer-secret",
      MPESA_PASSKEY: "test-passkey",
      MPESA_SHORTCODE: "174379",
    },
  },
});
