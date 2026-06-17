"use client";

import { ContextAuditPanel } from "@/components/claims/ContextAuditPanel";
import { DraftPanel } from "@/components/claims/DraftPanel";
import { MemoryProbe } from "@/components/claims/MemoryProbe";
import { Header } from "@/components/layout/Header";
import {
  Badge,
  priorityVariant,
  statusVariant,
} from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Draft, Ticket } from "@/lib/types";
import { formatDate, priorityLabel, statusLabel } from "@/lib/utils";
import { ArrowLeft, Building2, Mail, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function ClaimDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ticketId = Number(params.id);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketData, draftData] = await Promise.all([
        api.getTicket(ticketId),
        api.getDraft(ticketId).catch(() => null),
      ]);
      setTicket(ticketData);
      setDraft(draftData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claim");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <Header title="Loading claim…" />
        <main className="px-8 py-8 text-sm text-slate-500">Please wait…</main>
      </>
    );
  }

  if (error || !ticket) {
    return (
      <>
        <Header title="Claim not found" />
        <main className="px-8 py-8">
          <p className="text-sm text-red-600">{error ?? "Claim not found"}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            ← Back to queue
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        title={`Claim #${ticket.id}`}
        subtitle={ticket.subject}
      />
      <main className="flex-1 space-y-8 px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-surface-border bg-white p-6 shadow-card lg:col-span-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant(ticket.status)}>
                {statusLabel(ticket.status)}
              </Badge>
              <Badge variant={priorityVariant(ticket.priority)}>
                {priorityLabel(ticket.priority)}
              </Badge>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Claimant
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {ticket.customer_name || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Email
                  </p>
                  <p className="text-sm text-slate-800">{ticket.customer_email}</p>
                </div>
              </div>
              {ticket.customer_company && (
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Organization
                    </p>
                    <p className="text-sm text-slate-800">
                      {ticket.customer_company}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-surface-border pt-4">
              <p className="text-xs text-slate-500">
                Created {formatDate(ticket.created_at)}
              </p>
              <p className="text-xs text-slate-500">
                Updated {formatDate(ticket.updated_at)}
              </p>
            </div>

            <div className="border-t border-surface-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                FNOL Details
              </p>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                {ticket.description}
              </pre>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <DraftPanel
              ticketId={ticket.id}
              onUpdated={load}
            />
            <MemoryProbe
              customerId={ticket.customer_id}
              defaultQuery={`${ticket.subject} ${ticket.priority}`}
            />
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Recommendation Audit Trail
          </h2>
          <ContextAuditPanel context={draft?.context_used} />
        </section>
      </main>
    </>
  );
}
