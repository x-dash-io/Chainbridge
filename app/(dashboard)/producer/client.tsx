"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductForm } from "@/components/producer/product-form";
import { ProductList } from "@/components/producer/product-list";
import { IncomingOrders } from "@/components/producer/incoming-orders";

type ProductItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  pricePerUnit: string;
  quantityAvailable: number;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  status: string;
};

type IncomingOrder = {
  orderId: string;
  productName: string;
  consumerName: string;
  quantity: number;
  totalAmount: string;
  rawSupplyLeg: {
    id: string;
    status: string;
    amount: string;
    assignedAt: string | null;
  };
  legs: {
    id: string;
    roleLabel: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    amount: string;
    timestamp?: string;
    assignee?: string;
  }[];
};

type ProducerDashboardClientProps = {
  products: ProductItem[];
  incomingOrders: IncomingOrder[];
};

const tabs = [
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ProducerDashboardClient({
  products,
  incomingOrders,
}: ProducerDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("products");
  const [showNewForm, setShowNewForm] = useState(false);
  const router = useRouter();

  // Poll for fresh order statuses every 20s
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

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
            {tab.id === "orders" && incomingOrders.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {incomingOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "products" && (
        <div className="flex flex-col gap-6">
          {!showNewForm && (
            <div>
              <Button onClick={() => setShowNewForm(true)}>
                Post a product
              </Button>
            </div>
          )}

          {showNewForm && (
            <Card>
              <CardHeader>
                <CardTitle>New product</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductForm onSuccess={() => setShowNewForm(false)} />
              </CardContent>
            </Card>
          )}

          <ProductList products={products} />
        </div>
      )}

      {activeTab === "orders" && (
        <IncomingOrders orders={incomingOrders} />
      )}
    </div>
  );
}
