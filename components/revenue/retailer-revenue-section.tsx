"use client";

import type { RetailerRevenueStats } from "@/lib/orders/revenue";

export function RetailerRevenueSection({ data }: { data: RetailerRevenueStats }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Revenue Overview
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Total Revenue</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            KES {data.totalRevenue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Cost of Goods</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-badge-warning-fg">
            KES {data.totalCost.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Total Margin</p>
          <p className={`mt-1 text-xl font-semibold tracking-tight ${data.totalMargin >= 0 ? "text-primary" : "text-destructive"}`}>
            KES {data.totalMargin.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Margin %</p>
          <p className={`mt-1 text-xl font-semibold tracking-tight ${data.marginPercent >= 0 ? "text-primary" : "text-destructive"}`}>
            {data.marginPercent.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Pending Payout</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-badge-warning-fg">
            KES {data.pendingPayout.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-muted">Received Payout</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-primary">
            KES {data.receivedPayout.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium text-foreground">Monthly Revenue vs Cost</h3>
        {data.monthlyBreakdown.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
            No sales data yet
          </div>
        ) : (
          <div className="flex h-48 items-end gap-2">
            {data.monthlyBreakdown.map((m) => {
              const maxVal = Math.max(...data.monthlyBreakdown.flatMap((d) => [d.revenue, d.cost]), 1);
              const label = new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted">
                    KES {m.revenue.toLocaleString()}
                  </span>
                  <div className="flex w-full max-w-[48px] flex-col-reverse gap-0.5" style={{ height: `${(m.revenue / maxVal) * 120 + 4}px` }}>
                    <div className="w-full flex-1 rounded-t bg-primary/60 transition-all hover:bg-primary" style={{ height: `${(m.revenue / maxVal) * 100}%` }} />
                    <div className="w-full rounded-t bg-badge-warning-fg/40 transition-all hover:bg-badge-warning-fg/60" style={{ height: `${(m.cost / maxVal) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted">{label}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded bg-primary/60" /> Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded bg-badge-warning-fg/40" /> Cost
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border/40 px-5 py-3">
          <h3 className="text-sm font-medium text-foreground">Recent Sales</h3>
        </div>
        {data.recentSales.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            No sales yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/40 text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Qty</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {data.recentSales.map((s) => (
                  <tr key={s.orderId} className="hover:bg-background/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{s.productName}</td>
                    <td className="px-5 py-3 text-muted">×{s.quantity}</td>
                    <td className="px-5 py-3 font-mono text-foreground">KES {Number(s.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-xs text-muted">{new Date(s.date).toLocaleDateString()}</td>
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
