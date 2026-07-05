import { requireRole } from "@/lib/auth";
import { getAvailableJobs, getMyJobs } from "@/lib/orders/job-queue-actions";
import { getServiceProviderRevenue } from "@/lib/orders/revenue";
import { StatStrip } from "@/components/ui/stat-strip";
import { JobQueue } from "@/components/jobs/job-queue";
import { RevenueSection } from "@/components/revenue/revenue-section";

export default async function PackerDashboard() {
  const user = await requireRole("packer");
  const [availableJobs, myJobs] = await Promise.all([
    getAvailableJobs(user.role),
    getMyJobs(user.id, user.role),
  ]);

  const assignedJobs = myJobs.filter((j) => j.status === "assigned").length;
  const inProgressJobs = myJobs.filter((j) => j.status === "in_progress").length;
  const completedJobs = myJobs.filter(
    (j) => j.status === "completed" || j.status === "paid",
  ).length;

  const revenueData = await getServiceProviderRevenue(user.id);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Packer Dashboard
        </h1>
        <p className="text-base text-muted">Welcome, {user.name}.</p>
      </div>

      <StatStrip
        stats={[
          { label: "Jobs Assigned", value: assignedJobs },
          { label: "In Progress", value: inProgressJobs },
          { label: "Completed", value: completedJobs },
        ]}
      />

      <JobQueue
        availableJobs={availableJobs}
        myJobs={myJobs}
        roleLabel="Packer"
        role="packer"
        userId={user.id}
      />

      <RevenueSection data={revenueData} roleName="Packer" />
    </>
  );
}
