"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { UsersTab } from "@/components/admin/users-tab";
import { OrdersTab } from "@/components/admin/orders-tab";
import { DisputesTab } from "@/components/admin/disputes-tab";
import { ReportsTab } from "@/components/admin/reports-tab";
import { AuditTab } from "@/components/admin/audit-tab";

const tabs = [
  { id: "users", label: "Users" },
  { id: "orders", label: "Orders" },
  { id: "disputes", label: "Disputes" },
  { id: "audit", label: "Audit Log" },
  { id: "reports", label: "Reporting" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<TabId>("users");

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
          </button>
        ))}
      </div>

      {activeTab === "users" && <UsersTab />}
      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "disputes" && <DisputesTab />}
      {activeTab === "audit" && <AuditTab />}
      {activeTab === "reports" && <ReportsTab />}
    </div>
  );
}
