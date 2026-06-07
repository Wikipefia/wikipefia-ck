"use client";

import { Badge, ThemeToggle } from "@wikipefia/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { C } from "@/lib/theme";

interface NavItem {
  href: string;
  label: string;
  /** `true` ⇒ active only on exact match (used for the index route). */
  exact?: boolean;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", exact: true },
  { href: "/subjects", label: "Subjects" },
  { href: "/repositories", label: "Repositories" },
  { href: "/moderation", label: "Moderation", soon: true },
  { href: "/ai", label: "AI", soon: true },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Header */}
      <header
        className="h-11 flex items-center justify-between px-4 border-b shrink-0"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[13px] font-bold uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            Wikipefia Admin
          </span>
          <Badge variant="accent" className="text-[9px] tracking-[0.15em]">
            Console
          </Badge>
        </div>
        <ThemeToggle
          size="icon-sm"
          className="border-invert-fg/20 text-invert-fg"
        />
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Nav */}
        <nav
          className="shrink-0 w-[200px] border-r flex flex-col py-2 min-h-0"
          style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
        >
          {NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-2.5 transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: active ? C.accent : C.textMuted,
                  backgroundColor: active ? C.bgWhite : "transparent",
                  borderLeft: `2px solid ${active ? C.accent : "transparent"}`,
                }}
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.1em]">
                  {item.label}
                </span>
                {item.soon && (
                  <span
                    className="text-[7px] font-bold uppercase tracking-[0.1em] opacity-60"
                    style={{ color: C.textMuted }}
                  >
                    soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Main */}
        <main
          className="flex-1 min-w-0 overflow-auto"
          style={{ backgroundColor: C.bgWhite }}
        >
          <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
