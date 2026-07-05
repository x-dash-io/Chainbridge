"use client";

type MonthlyData = {
  month: string;
  amount: number;
};

export function RevenueChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
        No revenue data yet
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const barMaxHeight = 140;

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d) => {
        const height = (d.amount / maxAmount) * barMaxHeight;
        const label = new Date(d.month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        return (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted">
              KES {d.amount.toLocaleString()}
            </span>
            <div
              className="w-full max-w-[48px] rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all hover:from-primary hover:to-primary/80"
              style={{ height: `${Math.max(height, 3)}px` }}
            />
            <span className="text-[10px] text-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
