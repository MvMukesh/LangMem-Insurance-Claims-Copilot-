"use client";

import { cn } from "@/lib/utils";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Claims Queue", icon: LayoutDashboard },
  { href: "/claims/new", label: "Register FNOL", icon: PlusCircle },
  { href: "/admin", label: "Knowledge Base", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-text">
      <div className="border-b border-sidebar-border px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-heading">
              Claims Copilot
            </p>
            <p className="text-xs text-sidebar-text">Adjuster Workbench</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/claims/")
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-ring",
                active
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-heading",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="flex items-start gap-2 rounded-lg bg-sidebar-hover/60 px-3 py-3">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          <div>
            <p className="text-xs font-medium text-sidebar-heading">
              Human-in-the-loop
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-sidebar-text">
              AI recommends coverage. Licensed adjusters approve all decisions.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
