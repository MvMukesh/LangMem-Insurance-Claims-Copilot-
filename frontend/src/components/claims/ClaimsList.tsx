"use client";

import type { Ticket } from "@/lib/types";
import {
  Badge,
  priorityVariant,
  statusVariant,
} from "@/components/ui/badge";
import { formatDate, priorityLabel, statusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function ClaimsList({ tickets }: { tickets: Ticket[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const statuses = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.status))).sort(),
    [tickets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (priorityFilter !== "all" && ticket.priority !== priorityFilter)
        return false;
      if (!q) return true;
      return (
        ticket.subject.toLowerCase().includes(q) ||
        ticket.customer_email.toLowerCase().includes(q) ||
        String(ticket.id).includes(q) ||
        (ticket.customer_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-white px-8 py-16 text-center">
        <p className="text-base font-medium text-slate-800">No claims yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Register a First Notice of Loss to start the adjuster workflow.
        </p>
        <Link
          href="/claims/new"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 focus-ring"
        >
          Register FNOL
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by claim #, email, or subject…"
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm focus-ring"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm focus-ring"
        >
          <option value="all">All severities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-slate-50">
            <tr>
              {["Claim", "Claimant", "Subject", "Severity", "Status", "Updated"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.map((ticket) => (
              <tr
                key={ticket.id}
                className="transition-colors hover:bg-brand-50/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/claims/${ticket.id}`}
                    className={cn(
                      "font-mono text-sm font-semibold text-brand-700 hover:text-brand-800 focus-ring rounded",
                    )}
                  >
                    #{ticket.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">
                    {ticket.customer_name || "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {ticket.customer_email}
                  </div>
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-700">
                  {ticket.subject}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={priorityVariant(ticket.priority)}>
                    {priorityLabel(ticket.priority)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(ticket.status)}>
                    {statusLabel(ticket.status)}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {formatDate(ticket.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No claims match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
