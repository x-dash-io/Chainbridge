"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckoutFlow } from "@/components/consumer/checkout-flow";
import { OrderTracking } from "@/components/consumer/order-tracking";

type ProductItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  pricePerUnit: string;
  quantityAvailable: number;
  sellerName: string;
  imageUrl: string | null;
};

type ServiceProvider = {
  id: string;
  name: string;
  role: string;
};

type OrderLeg = {
  id: string;
  roleLabel: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  isPaid?: boolean;
  amount: string;
  timestamp?: string;
  assignee?: string;
};

type ConsumerOrder = {
  orderId: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  createdAt: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  isPaid?: boolean;
  paymentStatus?: string | null;
  legs: OrderLeg[];
};

type ConsumerDashboardClientProps = {
  products: ProductItem[];
  serviceProviders: {
    processors: ServiceProvider[];
    packers: ServiceProvider[];
    agents: ServiceProvider[];
  };
  orders: ConsumerOrder[];
};

const tabs = [
  { id: "browse", label: "Browse Products" },
  { id: "orders", label: "My Orders" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ConsumerDashboardClient({
  products,
  serviceProviders,
  orders,
}: ConsumerDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("browse");
  const router = useRouter();

  // Poll for fresh order status every 15s
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

  const handleOrderCreated = (_orderId: string) => {
    setActiveTab("orders");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              activeTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.id === "orders" && orders.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "browse" && (
        <CheckoutFlow
          products={products}
          serviceProviders={serviceProviders}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {activeTab === "orders" && (
        <OrderTracking orders={orders} />
      )}
    </div>
  );
}