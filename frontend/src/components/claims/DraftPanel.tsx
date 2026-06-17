"use client";

import { api } from "@/lib/api";
import type { Draft } from "@/lib/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function DraftPanel({
  ticketId,
  onUpdated,
}: {
  ticketId: number;
  onUpdated?: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDraft(ticketId);
      setDraft(data);
      setContent(data.content);
    } catch {
      setDraft(null);
      setContent("");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateDraft(ticketId);
      setDraft(result.draft);
      setContent(result.draft.content);
      toast("success", "Coverage recommendation generated");
      onUpdated?.();
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Generation failed",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = async (status: "accepted" | "discarded") => {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await api.updateDraft(draft.id, { content, status });
      setDraft(updated);
      toast(
        status === "accepted" ? "success" : "info",
        status === "accepted"
          ? "Recommendation approved and saved to claim memory"
          : "Marked as request for more information",
      );
      onUpdated?.();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Loading recommendation…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Coverage Recommendation</CardTitle>
          <CardDescription>
            AI-assisted draft — licensed adjuster makes the final decision.
          </CardDescription>
        </div>
        {draft && (
          <Badge variant={statusVariant(draft.status)}>{draft.status}</Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {draft?.status === "failed" && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Latest generation attempt failed. Check API keys and retry.
          </div>
        )}

        {!draft ? (
          <div className="rounded-xl border border-dashed border-surface-border bg-slate-50 px-6 py-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-brand-500" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              No recommendation yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Generate an AI coverage recommendation using claim history, policy
              KB, and decision tools.
            </p>
            <Button
              className="mt-5"
              onClick={handleGenerate}
              loading={generating}
            >
              Generate Recommendation
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-sm leading-relaxed"
              placeholder="Recommendation content…"
            />
            <p className="text-xs text-slate-500">
              Edit the draft before approving or requesting additional
              information from the claimant.
            </p>
          </>
        )}
      </CardContent>

      {draft && (
        <CardFooter className="justify-between">
          <Button
            variant="secondary"
            onClick={handleGenerate}
            loading={generating}
          >
            Regenerate
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleUpdate("discarded")}
              loading={saving}
            >
              Request Info
            </Button>
            <Button
              variant="success"
              onClick={() => handleUpdate("accepted")}
              loading={saving}
            >
              Approve Recommendation
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
