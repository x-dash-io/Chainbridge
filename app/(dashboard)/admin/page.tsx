import { requireRole } from "@/lib/auth";
import { db } from "@/db/client";
import { users, disputes, orders } from "@/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { StatStrip } from "@/components/ui/stat-strip";
import { AdminDashboardClient } from "./client";

export default async function AdminDashboard() {
  const user = await requireRole("admin");

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  const [openDisputeCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(disputes)
    .where(eq(disputes.status, "open"));

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [ordersThisWeek] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(gte(orders.createdAt, startOfWeek));

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin Operations Console
        </h1>
        <p className="text-base text-muted">Welcome, {user.name}.</p>
      </div>

      <StatStrip
        stats={[
          { label: "Total Users", value: Number(userCount?.count ?? 0) },
          { label: "Open Disputes", value: Number(openDisputeCount?.count ?? 0) },
          { label: "Orders This Week", value: Number(ordersThisWeek?.count ?? 0) },
        ]}
      />

      <AdminDashboardClient />
    </>
  );
}
