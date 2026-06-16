import { ConsistencyMatrix } from "@/components/admin/ConsistencyMatrix";
import { AdminReportsPanel } from "@/components/admin/AdminReportsPanel";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-haven-emerald">Manager Portal</p>
        <h1 className="text-3xl font-bold">Group Health</h1>
        <p className="text-haven-muted">Member consistency tracker and giving overview</p>
      </header>

      <ConsistencyMatrix />
      <AdminReportsPanel />
    </main>
  );
}
