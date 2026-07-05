/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { requireAdmin, requireConsumerOrRetailer, requireRetailer } from "@/lib/auth/authorization";

describe("authorization helpers", () => {
  describe("requireAdmin", () => {
    it("passes for admin role", () => {
      const user = { id: "1", email: "a@a.com", name: "Admin", role: "admin", phone: null, verified: true };
      expect(() => requireAdmin(user)).not.toThrow();
    });

    it("throws for non-admin roles", () => {
      const consumer = { id: "2", email: "c@c.com", name: "Consumer", role: "consumer", phone: null, verified: true };
      const producer = { id: "3", email: "p@p.com", name: "Producer", role: "producer", phone: null, verified: true };
      const retailer = { id: "4", email: "r@r.com", name: "Retailer", role: "retailer", phone: null, verified: true };

      expect(() => requireAdmin(consumer)).toThrow("Admin authorization required");
      expect(() => requireAdmin(producer)).toThrow("Admin authorization required");
      expect(() => requireAdmin(retailer)).toThrow("Admin authorization required");
    });
  });

  describe("requireConsumerOrRetailer", () => {
    it("passes for consumer role", () => {
      const user = { id: "1", email: "c@c.com", name: "Consumer", role: "consumer", phone: null, verified: true };
      expect(() => requireConsumerOrRetailer(user)).not.toThrow();
    });

    it("passes for retailer role", () => {
      const user = { id: "2", email: "r@r.com", name: "Retailer", role: "retailer", phone: null, verified: true };
      expect(() => requireConsumerOrRetailer(user)).not.toThrow();
    });

    it("throws for non-consumer/retailer roles", () => {
      const user = { id: "3", email: "p@p.com", name: "Producer", role: "producer", phone: null, verified: true };
      expect(() => requireConsumerOrRetailer(user)).toThrow("Only consumers and retailers");
    });
  });

  describe("requireRetailer", () => {
    it("passes for retailer role", () => {
      const user = { id: "1", email: "r@r.com", name: "Retailer", role: "retailer", phone: null, verified: true };
      expect(() => requireRetailer(user)).not.toThrow();
    });

    it("throws for non-retailer roles", () => {
      const consumer = { id: "2", email: "c@c.com", name: "Consumer", role: "consumer", phone: null, verified: true };
      const producer = { id: "3", email: "p@p.com", name: "Producer", role: "producer", phone: null, verified: true };
      expect(() => requireRetailer(consumer)).toThrow("Only retailers");
      expect(() => requireRetailer(producer)).toThrow("Only retailers");
    });
  });
});
