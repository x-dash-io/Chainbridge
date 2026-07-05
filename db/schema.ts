import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = [
  "producer",
  "processor",
  "packer",
  "delivery_agent",
  "retailer",
  "consumer",
  "admin",
] as const;

export const productStatusEnum = ["active", "sold_out", "delisted"] as const;

export const legTypeEnum = [
  "raw_supply",
  "processing",
  "packing",
  "delivery",
] as const;

export const legStatusEnum = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "paid",
  "cancelled",
] as const;

export const paymentStatusEnum = [
  "initiated",
  "pending_confirmation",
  "completed",
  "failed",
  "cancelled",
] as const;

export const payoutStatusEnum = ["owed", "paid"] as const;

export const sellerRoleEnum = ["producer", "retailer"] as const;

export const disputeStatusEnum = [
  "open",
  "under_review",
  "resolved_override",
  "resolved_refund_flagged",
] as const;

export const role = pgEnum("role", roleEnum);
export const legType = pgEnum("leg_type", legTypeEnum);
export const legStatus = pgEnum("leg_status", legStatusEnum);
export const sellerRole = pgEnum("seller_role", sellerRoleEnum);
export const disputeStatus = pgEnum("dispute_status", disputeStatusEnum);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  role: role("role").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// @ts-expect-error — circular FK: products↔orders (03-DATABASE-SCHEMA.md §4 note). Drizzle lazy callbacks handle at runtime.
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: uuid("seller_id")
    .references(() => users.id)
    .notNull(),
  sellerRole: sellerRole("seller_role").notNull(),
  sourceOrderId: uuid("source_order_id")
    // @ts-expect-error — circular FK, Drizzle lazy callback
    .references(() => orders.id),
  externallySourced: boolean("externally_sourced").default(false),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  pricePerUnit: decimal("price_per_unit", {
    precision: 10,
    scale: 2,
  }).notNull(),
  quantityAvailable: integer("quantity_available").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// @ts-expect-error — circular FK: orders↔products (03-DATABASE-SCHEMA.md §4 note). Drizzle lazy callbacks handle at runtime.
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  consumerId: uuid("consumer_id")
    .references(() => users.id)
    .notNull(),
  productId: uuid("product_id")
    // @ts-expect-error — circular FK, Drizzle lazy callback
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderLegs = pgTable("order_legs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  legType: legType("leg_type").notNull(),
  assignedUserId: uuid("assigned_user_id").references(() => users.id),
  status: legStatus("status").default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  assignedAt: timestamp("assigned_at"),
  completedAt: timestamp("completed_at"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  checkoutRequestId: varchar("checkout_request_id", { length: 100 }),
  mpesaReceipt: varchar("mpesa_receipt", { length: 100 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).default("initiated"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderLegId: uuid("order_leg_id")
    .references(() => orderLegs.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("owed"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderLegId: uuid("order_leg_id")
    .references(() => orderLegs.id)
    .notNull(),
  raisedByUserId: uuid("raised_by_user_id")
    .references(() => users.id)
    .notNull(),
  resolvedByAdminId: uuid("resolved_by_admin_id").references(() => users.id),
  reason: text("reason").notNull(),
  status: disputeStatus("status").default("open"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});
