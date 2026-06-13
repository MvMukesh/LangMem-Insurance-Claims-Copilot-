"use client";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        await api.health();
        if (mounted) setHealthy(true);
      } catch {
        if (mounted) setHealthy(false);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-surface-border bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset",
              healthy === null && "bg-slate-50 text-slate-600 ring-slate-200",
              healthy === true &&
                "bg-emerald-50 text-emerald-700 ring-emerald-200",
              healthy === false && "bg-red-50 text-red-700 ring-red-200",
            )}
          >
            {healthy === false ? (
              <WifiOff className="h-3.5 w-3.5" />
            ) : (
              <Wifi className="h-3.5 w-3.5" />
            )}
            API {healthy === null ? "checking…" : healthy ? "connected" : "offline"}
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <Activity className="h-3.5 w-3.5" />
            {api.baseUrl}
          </div>
        </div>
      </div>
    </header>
  );
}
