import { db } from "@/db/client";
import { products, orders, orderLegs, users, payouts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { StatStrip } from "@/components/ui/stat-strip";
import { getServiceProviderRevenue } from "@/lib/orders/revenue";
import { RevenueSection } from "@/components/revenue/revenue-section";
import { ProducerDashboardClient } from "./client";

export default async function ProducerDashboard() {
  const user = await requireRole("producer");

  const productRows = await db
    .select()
    .from(products)
    .where(and(eq(products.sellerId, user.id), eq(products.sellerRole, "producer")))
    .orderBy(products.createdAt);

  const rawSupplyLegs = await db
    .select()
    .from(orderLegs)
    .where(
      and(
        eq(orderLegs.assignedUserId, user.id),
        eq(orderLegs.legType, "raw_supply"),
      ),
    );

  const orderIds = [...new Set(rawSupplyLegs.map((l) => l.orderId))];

  const orderRows = orderIds.length > 0
    ? await db
        .select()
        .from(orders)
        .where(inArray(orders.id, orderIds))
    : [];

  const consumerIds = [...new Set(orderRows.map((o) => o.consumerId))];

  const consumerRows = consumerIds.length > 0
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, consumerIds))
    : [];

  const consumerMap = new Map(consumerRows.map((c) => [c.id, c.name]));

  const allLegsForOrders = orderIds.length > 0
    ? await db
        .select()
        .from(orderLegs)
        .where(inArray(orderLegs.orderId, orderIds))
    : [];

  const legsByOrder = new Map<string, typeof allLegsForOrders>();
  for (const leg of allLegsForOrders) {
    const existing = legsByOrder.get(leg.orderId) ?? [];
    existing.push(leg);
    legsByOrder.set(leg.orderId, existing);
  }

  const productMapForOrders = new Map(productRows.map((p) => [p.id, p.name]));

  const incomingOrders = rawSupplyLegs.map((rawLeg) => {
    const ord = orderRows.find((o) => o.id === rawLeg.orderId)!;
    const allLegsForThisOrder = legsByOrder.get(rawLeg.orderId) ?? [];

    return {
      orderId: ord.id,
      productName: productMapForOrders.get(ord.productId) ?? "Unknown",
      consumerName: consumerMap.get(ord.consumerId) ?? "Unknown",
      quantity: ord.quantity,
      totalAmount: ord.totalAmount,
      rawSupplyLeg: {
        id: rawLeg.id,
        status: rawLeg.status ?? "pending",
        amount: rawLeg.amount,
        assignedAt: rawLeg.assignedAt?.toISOString() ?? null,
      },
      legs: allLegsForThisOrder.map((l) => ({
        id: l.id,
        roleLabel: l.legType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        status: l.status as "pending" | "in_progress" | "completed" | "cancelled",
        amount: `KES ${l.amount}`,
        timestamp: l.assignedAt?.toLocaleDateString() ?? undefined,
        assignee: undefined,
      })),
    };
  });

  const activeListings = productRows.filter((p) => p.status === "active").length;
  const pendingOrders = rawSupplyLegs.filter(
    (l) => l.status && !["completed", "paid"].includes(l.status),
  ).length;

  const paidPayouts = await db
    .select()
    .from(payouts)
    .where(and(eq(payouts.userId, user.id), eq(payouts.status, "paid")));
  const totalRevenue = paidPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

  const revenueData = await getServiceProviderRevenue(user.id);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Producer Dashboard
        </h1>
        <p className="text-base text-muted">Welcome, {user.name}.</p>
      </div>

      <StatStrip
        stats={[
          { label: "Active Listings", value: activeListings },
          { label: "Pending Orders", value: pendingOrders },
          {
            label: "Total Revenue (KES)",
            value: totalRevenue.toLocaleString("en-KE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          },
        ]}
      />

      <ProducerDashboardClient
        products={productRows.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          pricePerUnit: p.pricePerUnit,
          quantityAvailable: p.quantityAvailable,
          description: p.description,
          imageUrl: p.imageUrl,
          imagePublicId: p.imagePublicId,
          status: p.status ?? "active",
        }))}
        incomingOrders={incomingOrders}
      />

      <RevenueSection data={revenueData} roleName="Producer" />
    </>
  );
}
