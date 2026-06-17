"use client";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Database, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function AdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    files_indexed: number;
    chunks_indexed: number;
    collection_count: number;
  } | null>(null);

  const handleIngest = async (clearExisting: boolean) => {
    setLoading(true);
    try {
      const result = await api.ingestKnowledge(clearExisting);
      setLastResult(result);
      toast(
        "success",
        `Indexed ${result.files_indexed} files (${result.chunks_indexed} chunks)`,
      );
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Knowledge Base"
        subtitle="Manage policy documents and regulation sources for RAG retrieval."
      />
      <main className="mx-auto max-w-3xl flex-1 space-y-6 px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Policy & Regulation Index</CardTitle>
                <CardDescription>
                  Ingest markdown files from the knowledge base into ChromaDB
                  for coverage recommendation retrieval.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-slate-600">
              Source files live in the backend{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                knowledge_base/
              </code>{" "}
              directory. Run ingest after adding or updating policy documents.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleIngest(false)} loading={loading}>
                <RefreshCw className="h-4 w-4" />
                Incremental Ingest
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleIngest(true)}
                loading={loading}
              >
                Rebuild Index (Clear Existing)
              </Button>
            </div>

            {lastResult && (
              <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-500">Files</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {lastResult.files_indexed}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Chunks</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {lastResult.chunks_indexed}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Collection</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {lastResult.collection_count}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
