import { requireRole } from "@/lib/auth";
import { db } from "@/db/client";
import { products, orders, orderLegs, payments, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { StatStrip } from "@/components/ui/stat-strip";
import { ConsumerDashboardClient } from "./client";

export default async function ConsumerDashboard() {
  const user = await requireRole("consumer", "retailer");

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      unit: products.unit,
      pricePerUnit: products.pricePerUnit,
      quantityAvailable: products.quantityAvailable,
      sellerId: products.sellerId,
      sellerName: users.name,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .innerJoin(users, eq(products.sellerId, users.id))
    .where(eq(products.status, "active"));

  const serviceProviders = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(
      inArray(users.role, ["processor", "packer", "delivery_agent"]),
    );

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.consumerId, user.id))
    .orderBy(orders.createdAt);

  let consumerOrders: Array<{
    orderId: string;
    productName: string;
    quantity: number;
    totalAmount: string;
    createdAt: string;
      status: "pending" | "in_progress" | "completed" | "cancelled";
      isPaid: boolean;
      paymentStatus: string | null;
      legs: Array<{
      id: string;
      roleLabel: string;
      status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
      isPaid?: boolean;
      amount: string;
      timestamp?: string;
      assignee?: string;
    }>;
  }> = [];

  let activeOrderCount = 0;
  let completedOrderCount = 0;
  let totalSpent = 0;

  if (orderRows.length > 0) {
    const orderIds = orderRows.map((o) => o.id);
    const paymentRows = await db
      .select()
      .from(payments)
      .where(inArray(payments.orderId, orderIds));
    const paidOrderIds = new Set(
      paymentRows
        .filter((p) => p.status === "completed")
        .map((payment) => payment.orderId),
    );
    const paymentStatusByOrder = new Map<string, string>();
    for (const p of paymentRows) {
      const existing = paymentStatusByOrder.get(p.orderId);
      if (!existing || p.status === "completed") {
        paymentStatusByOrder.set(p.orderId, p.status ?? "initiated");
      }
    }

    const legRows = await db
      .select()
      .from(orderLegs)
      .where(inArray(orderLegs.orderId, orderIds));

    const legsByOrder = new Map<string, typeof legRows>();
    for (const leg of legRows) {
      const existing = legsByOrder.get(leg.orderId) ?? [];
      existing.push(leg);
      legsByOrder.set(leg.orderId, existing);
    }

    const productIds = [...new Set(orderRows.map((o) => o.productId).filter(Boolean))] as string[];
    const fetchedProductRows = productIds.length > 0
      ? await db
          .select()
          .from(products)
          .where(inArray(products.id, productIds))
      : [];
    const productMap = new Map(fetchedProductRows.map((p) => [p.id, p.name]));

    const assigneeIds = [
      ...new Set(legRows.map((l) => l.assignedUserId).filter(Boolean)),
    ];
    const assigneeRows =
      assigneeIds.length > 0
        ? await db
            .select()
            .from(users)
            .where(inArray(users.id, assigneeIds as string[]))
        : [];
    const assigneeMap = new Map(assigneeRows.map((a) => [a.id, a.name]));

    consumerOrders = orderRows.map((order) => {
      const orderLegsList = legsByOrder.get(order.id) ?? [];
      const statuses = orderLegsList.map((l) => l.status);
      const allCancelled = statuses.every((s) => s === "cancelled");
      const nonCancelled = statuses.filter((s) => s !== "cancelled");
      const allPaid = nonCancelled.length > 0 && nonCancelled.every((s) => s === "paid");
      const allPending = nonCancelled.every((s) => s === "pending" || s === null);
      const overall = allCancelled ? "cancelled" : allPaid ? "completed" : allPending ? "pending" : "in_progress";
      const isPaid = paidOrderIds.has(order.id);

      if (overall === "completed") completedOrderCount++;
      else if (overall !== "cancelled") activeOrderCount++;

      if (isPaid) {
        totalSpent += Number(order.totalAmount);
      }

      return {
        orderId: order.id,
        productName: productMap.get(order.productId) ?? "Unknown",
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt?.toISOString() ?? "",
        status: overall as "pending" | "in_progress" | "completed" | "cancelled",
        isPaid,
        paymentStatus: paymentStatusByOrder.get(order.id) ?? null,
        legs: orderLegsList.map((l) => ({
          id: l.id,
          roleLabel: l.legType
            .replace("_", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          status: (l.status === "paid" ? "completed" : l.status ?? "pending") as
            | "pending"
            | "assigned"
            | "in_progress"
            | "completed"
            | "cancelled",
          isPaid: l.status === "paid",
          amount: `KES ${l.amount}`,
          timestamp: l.assignedAt?.toLocaleDateString() ?? undefined,
          assignee: l.assignedUserId
            ? assigneeMap.get(l.assignedUserId)
            : undefined,
        })),
      };
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Consumer Dashboard
        </h1>
        <p className="text-base text-muted">Welcome, {user.name}.</p>
      </div>

      <StatStrip
        stats={[
          { label: "Active Orders", value: activeOrderCount },
          { label: "Completed Orders", value: completedOrderCount },
          {
            label: "Total Spent (KES)",
            value: totalSpent.toLocaleString("en-KE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          },
        ]}
      />

      <ConsumerDashboardClient
        products={productRows.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          pricePerUnit: p.pricePerUnit,
          quantityAvailable: p.quantityAvailable,
          sellerName: p.sellerName,
          imageUrl: p.imageUrl,
        }))}
        serviceProviders={{
          processors: serviceProviders.filter((s) => s.role === "processor"),
          packers: serviceProviders.filter((s) => s.role === "packer"),
          agents: serviceProviders.filter((s) => s.role === "delivery_agent"),
        }}
        orders={consumerOrders}
      />
    </>
  );
}