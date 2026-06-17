"use client";

import type { DraftContext, DraftToolCall } from "@/lib/types";
import { Badge, MetricCard } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

function Expandable({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-surface-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 focus-ring"
      >
        {title}
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="border-t border-surface-border px-4 py-3">{children}</div>
      )}
    </div>
  );
}

function ToolCallRow({ call, index }: { call: DraftToolCall; index: number }) {
  return (
    <Expandable
      title={`${index + 1}. ${call.tool_name} (${call.status})`}
      defaultOpen={call.status !== "ok"}
    >
      <div className="space-y-3 text-sm">
        {(call.summary || call.output_text) && (
          <p className="text-slate-600">{call.summary || call.output_text}</p>
        )}
        {call.arguments && Object.keys(call.arguments).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-slate-500">
              Arguments
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(call.arguments, null, 2)}
            </pre>
          </div>
        )}
        {call.output ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-slate-500">
              Output
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(call.output, null, 2)}
            </pre>
          </div>
        ) : call.output_text ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-slate-500">
              Raw Output
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              {call.output_text}
            </pre>
          </div>
        ) : null}
      </div>
    </Expandable>
  );
}

export function ContextAuditPanel({
  context,
}: {
  context: DraftContext | null | undefined;
}) {
  if (!context) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          No audit context captured for this recommendation.
        </CardContent>
      </Card>
    );
  }

  if (context.version !== 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Context Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(context, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  const signals = context.signals ?? {};
  const memoryHits = context.memory_hits ?? [];
  const knowledgeHits = context.knowledge_hits ?? [];
  const toolCalls = context.tool_calls ?? [];
  const highlights = context.highlights ?? {};
  const toolErrors = toolCalls.filter((c) => c.status !== "ok").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Claim History Hits"
          value={signals.memory_hit_count ?? memoryHits.length}
        />
        <MetricCard
          label="Policy / KB Hits"
          value={signals.knowledge_hit_count ?? knowledgeHits.length}
        />
        <MetricCard
          label="Tool Calls"
          value={signals.tool_call_count ?? toolCalls.length}
        />
        <MetricCard
          label="Tool Errors"
          value={signals.tool_error_count ?? toolErrors}
        />
      </div>

      {signals.knowledge_sources && signals.knowledge_sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {signals.knowledge_sources.map((source) => (
            <Badge key={source} variant="info">
              {source}
            </Badge>
          ))}
        </div>
      )}

      {(highlights.memory?.length ||
        highlights.knowledge?.length ||
        highlights.tools?.length) && (
        <Card>
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["Claim History", highlights.memory],
                ["Policy & Regulations", highlights.knowledge],
                ["Tools", highlights.tools],
              ] as const
            ).map(([label, items]) =>
              items && items.length > 0 ? (
                <div key={label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </CardContent>
        </Card>
      )}

      {toolCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tool Execution Trace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {toolCalls.map((call, index) => (
              <ToolCallRow key={index} call={call} index={index} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Expandable title={`Claim History Details (${memoryHits.length})`}>
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(memoryHits, null, 2)}
          </pre>
        </Expandable>
        <Expandable title={`Policy / KB Details (${knowledgeHits.length})`}>
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(knowledgeHits, null, 2)}
          </pre>
        </Expandable>
      </div>

      {context.errors && context.errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Context Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {context.errors.map((err, i) => (
              <p key={i} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {err}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
