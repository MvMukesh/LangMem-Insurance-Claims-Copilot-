"use client";

import { api } from "@/lib/api";
import type { MemorySearchResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Search } from "lucide-react";
import { useState } from "react";

export function MemoryProbe({
  customerId,
  defaultQuery,
}: {
  customerId: number;
  defaultQuery: string;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await api.searchMemory(customerId, query.trim());
      setResults(response.results);
      setSearched(true);
      if (response.results.length === 0) {
        toast("info", "No relevant claim history hits for this query");
      }
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim History Probe</CardTitle>
        <CardDescription>
          Semantic search across prior resolutions and customer memory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup>
          <Label htmlFor="memory-query">Search by entities, issues, or keywords</Label>
          <div className="flex gap-2">
            <Input
              id="memory-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. collision deductible policy limits"
            />
            <Button onClick={handleSearch} loading={loading} className="shrink-0">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </FieldGroup>

        {searched && results.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No claim history matches yet. Approve a recommendation to build
            memory over time.
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((hit, index) => (
              <div
                key={index}
                className="rounded-lg border border-surface-border bg-slate-50/80 p-4"
              >
                <p className="text-sm leading-relaxed text-slate-800">
                  {hit.memory || "—"}
                </p>
                {hit.metadata && Object.keys(hit.metadata).length > 0 && (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-white p-2 text-xs text-slate-600">
                    {JSON.stringify(hit.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
