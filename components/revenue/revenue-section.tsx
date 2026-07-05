"use client";

import { RevenueChart } from "./revenue-chart";
import type { RevenueStats } from "@/lib/orders/revenue";

export function RevenueSection({ data, roleName }: { data: RevenueStats; roleName: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Revenue Overview
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Total Earned</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            KES {data.totalEarned.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Pending</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-badge-warning-fg">
            KES {data.pendingAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Paid Out</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-primary">
            KES {data.paidAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium text-foreground">Monthly Revenue</h3>
        <RevenueChart data={data.monthlyBreakdown} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border/40 px-5 py-3">
          <h3 className="text-sm font-medium text-foreground">Recent Transactions</h3>
        </div>
        {data.recentTransactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            No transactions yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/40 text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {data.recentTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-background/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {t.orderProductName}
                    </td>
                    <td className="px-5 py-3 capitalize text-muted">
                      {t.legType.replace("_", " ")}
                    </td>
                    <td className="px-5 py-3 font-mono text-foreground">
                      KES {Number(t.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "paid"
                            ? "bg-badge-success-bg text-badge-success-fg"
                            : "bg-badge-warning-bg text-badge-warning-fg"
                        }`}
                      >
                        {t.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
