import { ClaimsList } from "@/components/claims/ClaimsList";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/ui/badge";
import type { Ticket } from "@/lib/types";
import { api } from "@/lib/api";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let tickets: Ticket[] = [];
  let error: string | null = null;

  try {
    tickets = await api.listTickets();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load claims";
  }

  const open = tickets.filter((t) => t.status === "open").length;
  const urgent = tickets.filter((t) => t.priority === "urgent").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;

  return (
    <>
      <Header
        title="Claims Queue"
        subtitle="Review, triage, and resolve insurance claims with AI-assisted recommendations."
      />
      <main className="flex-1 space-y-8 px-8 py-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}. Ensure the API is running at {api.baseUrl}.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Claims" value={tickets.length} />
          <MetricCard label="Open" value={open} />
          <MetricCard label="Urgent" value={urgent} hint="Requires immediate attention" />
          <MetricCard label="Resolved" value={resolved} />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Claims</h2>
          <Link
            href="/claims/new"
            className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 focus-ring"
          >
            + Register FNOL
          </Link>
        </div>

        <ClaimsList tickets={tickets} />
      </main>
    </>
  );
}
