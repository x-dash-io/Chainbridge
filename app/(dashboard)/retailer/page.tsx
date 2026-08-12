import { requireRole } from "@/lib/auth";
import {
  getRetailerSourcingOrders,
  getRetailerResaleListings,
  getRetailerIncomingOrders,
} from "@/lib/products/actions";
import {
  getProductsForConsumer,
  getAvailableServiceProviders,
} from "@/lib/orders/actions";
import { getRetailerRevenue } from "@/lib/orders/revenue";
import { StatStrip } from "@/components/ui/stat-strip";
import { RetailerDashboardClient } from "./client";
import { RetailerRevenueSection } from "@/components/revenue/retailer-revenue-section";

export default async function RetailerDashboard() {
  const user = await requireRole("retailer");

  const products = (await getProductsForConsumer())
    .filter((p) => p.sellerId !== user.id);
  const serviceProviders = await getAvailableServiceProviders();
  const sourcingOrders = await getRetailerSourcingOrders();
  const resaleListings = await getRetailerResaleListings();
  const incomingOrders = await getRetailerIncomingOrders();

  const totalMarginRaw = resaleListings.reduce(
    (sum, l) => sum + (l.marginRaw ?? 0),
    0,
  );

  const retailerRevenue = await getRetailerRevenue(user.id);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Retailer Dashboard
        </h1>
        <p className="text-base text-muted">
          Welcome back, {user.name}. Manage your stock sourcing and resale listings.
        </p>
      </div>

      <StatStrip
        stats={[
          { label: "Sourcing Orders", value: sourcingOrders.length },
          { label: "Resale Listings", value: resaleListings.length },
          {
            label: "Margin (KES)",
            value: totalMarginRaw.toLocaleString("en-KE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          },
        ]}
      />

      <RetailerDashboardClient
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          pricePerUnit: p.pricePerUnit,
          quantityAvailable: p.quantityAvailable,
          sellerName: p.sellerName,
          imageUrl: p.imageUrl,
        }))}
        serviceProviders={serviceProviders}
        sourcingOrders={sourcingOrders}
        resaleListings={resaleListings}
        incomingOrders={incomingOrders}
      />

      <RetailerRevenueSection data={retailerRevenue} />
    </>
  );
}