"use server";

import { db } from "@/db/client";
import { payouts, orderLegs, orders, products, payments } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export type RevenueStats = {
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  monthlyBreakdown: { month: string; amount: number }[];
  recentTransactions: {
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
    orderProductName: string;
    legType: string;
  }[];
};

export async function getServiceProviderRevenue(userId: string): Promise<RevenueStats> {
  const allPayouts = await db
    .select()
    .from(payouts)
    .where(eq(payouts.userId, userId))
    .orderBy(sql<Date>`${payouts.createdAt} DESC`);

  const totalEarned = allPayouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pendingAmount = allPayouts
    .filter((p) => p.status === "owed")
    .reduce((s, p) => s + Number(p.amount), 0);
  const paidAmount = allPayouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  const paidPayouts = allPayouts.filter((p) => p.status === "paid");
  const monthlyMap = new Map<string, number>();
  for (const p of paidPayouts) {
    const d = p.createdAt ?? new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(p.amount));
  }
  const monthlyBreakdown = [...monthlyMap.entries()]
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const recentPayouts = allPayouts.slice(0, 10);
  const legIds = recentPayouts.map((p) => p.orderLegId);

  let legInfo: { legId: string; legType: string; orderId: string }[] = [];
  if (legIds.length > 0) {
    legInfo = await db
      .select({
        legId: orderLegs.id,
        legType: orderLegs.legType,
        orderId: orderLegs.orderId,
      })
      .from(orderLegs)
      .where(inArray(orderLegs.id, legIds));
  }

  const orderIds = [...new Set(legInfo.map((l) => l.orderId))];
  const orderProductMap = new Map<string, string>();
  if (orderIds.length > 0) {
    const rows = await db
      .select({
        orderId: orders.id,
        productName: products.name,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(inArray(orders.id, orderIds));
    for (const r of rows) orderProductMap.set(r.orderId, r.productName);
  }

  const legMetaMap = new Map(legInfo.map((l) => [l.legId, l]));

  const recentTransactions = recentPayouts.map((p) => {
    const meta = legMetaMap.get(p.orderLegId);
    return {
      id: p.id,
      amount: p.amount,
      status: p.status ?? "owed",
      createdAt: (p.createdAt ?? new Date()).toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      orderProductName: meta ? orderProductMap.get(meta.orderId) ?? "Unknown" : "Unknown",
      legType: meta?.legType ?? "unknown",
    };
  });

  return { totalEarned, pendingAmount, paidAmount, monthlyBreakdown, recentTransactions };
}

export type RetailerRevenueStats = {
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number;
  monthlyBreakdown: { month: string; revenue: number; cost: number }[];
  recentSales: {
    orderId: string;
    productName: string;
    quantity: number;
    amount: string;
    date: string;
  }[];
};

export async function getRetailerRevenue(userId: string): Promise<RetailerRevenueStats> {
  const resaleProducts = await db
    .select({
      id: products.id,
      name: products.name,
      pricePerUnit: products.pricePerUnit,
      sourceOrderId: products.sourceOrderId,
      externallySourced: products.externallySourced,
    })
    .from(products)
    .where(and(eq(products.sellerId, userId), eq(products.sellerRole, "retailer")));

  const productIds = resaleProducts.map((p) => p.id);
  const sourceOrderIds = resaleProducts
    .filter((p) => p.sourceOrderId)
    .map((p) => p.sourceOrderId) as string[];

  const costMap = new Map<string, number>();
  if (sourceOrderIds.length > 0) {
    const sourceOrders = await db
      .select({ id: orders.id, totalAmount: orders.totalAmount })
      .from(orders)
      .where(inArray(orders.id, sourceOrderIds));
    for (const o of sourceOrders) {
      costMap.set(o.id, Number(o.totalAmount));
    }
  }

  const salesRows = productIds.length > 0
    ? await db
        .select({
          productId: orders.productId,
          quantity: orders.quantity,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          orderId: orders.id,
        })
        .from(orders)
        .innerJoin(payments, eq(payments.orderId, orders.id))
        .where(
          and(
            inArray(orders.productId, productIds),
            eq(payments.status, "completed"),
          ),
        )
        .orderBy(sql<Date>`${orders.createdAt} DESC`)
    : [];

  const productNameMap = new Map(resaleProducts.map((p) => [p.id, p.name]));
  const productPriceMap = new Map(resaleProducts.map((p) => [p.id, Number(p.pricePerUnit)]));
  const productCostMap = new Map<string, number>();
  for (const p of resaleProducts) {
    if (p.sourceOrderId && !p.externallySourced) {
      productCostMap.set(p.id, costMap.get(p.sourceOrderId) ?? 0);
    }
  }

  const monthlyMap = new Map<string, { revenue: number; cost: number }>();
  let totalRevenue = 0;
  let totalCost = 0;

  for (const sale of salesRows) {
    const rev = Number(sale.totalAmount);
    totalRevenue += rev;

    const prodCost = productCostMap.get(sale.productId) ?? 0;
    const costShare = salesRows.filter((s) => s.productId === sale.productId).length > 0
      ? prodCost / salesRows.filter((s) => s.productId === sale.productId).length
      : 0;
    totalCost += costShare;

    const d = sale.createdAt ?? new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(key) ?? { revenue: 0, cost: 0 };
    existing.revenue += rev;
    existing.cost += costShare;
    monthlyMap.set(key, existing);
  }

  const monthlyBreakdown = [...monthlyMap.entries()]
    .map(([month, { revenue, cost }]) => ({
      month,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const totalMargin = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const recentSales = salesRows.slice(0, 10).map((s) => ({
    orderId: s.orderId,
    productName: productNameMap.get(s.productId) ?? "Unknown",
    quantity: s.quantity,
    amount: s.totalAmount,
    date: (s.createdAt ?? new Date()).toISOString(),
  }));

  return { totalRevenue, totalCost, totalMargin, marginPercent, monthlyBreakdown, recentSales };
}
