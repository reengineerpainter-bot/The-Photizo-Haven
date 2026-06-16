import { GivingDashboard } from "@/components/giving/GivingDashboard";
import { MonthlyReportDownload } from "@/components/reports/MonthlyReportDownload";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-haven-cyan">Member Dashboard</p>
        <h1 className="text-3xl font-bold">Your Giving</h1>
        <p className="text-haven-muted">Track all five categories in one place</p>
      </header>

      <GivingDashboard />

      <section className="mt-8">
        <MonthlyReportDownload scope="individual" />
      </section>
    </main>
  );
}
