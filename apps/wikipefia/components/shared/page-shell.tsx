"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { C } from "@/lib/theme";
import { SearchDialog } from "@/components/search/search-dialog";
import { LocaleSwitcher } from "@/components/navigation/locale-switcher";
import { useTheme } from "@/components/shared/theme-provider";

// ── Types ──────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  locale: string;
}

// ── Theme Toggle ──────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("common");

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="h-[34px] w-[34px] border flex items-center justify-center"
        style={{ borderColor: C.borderLight }}
      />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="h-[34px] w-[34px] border flex items-center justify-center cursor-pointer transition-colors"
      style={{ borderColor: C.borderLight, color: C.textMuted }}
      title={resolvedTheme === "dark" ? t("switchToLight") : t("switchToDark")}
      aria-label={resolvedTheme === "dark" ? t("switchToLight") : t("switchToDark")}
    >
      <span className="text-sm theme-toggle-icon" key={resolvedTheme}>
        {resolvedTheme === "dark" ? "☀" : "●"}
      </span>
    </button>
  );
}

// ── PageShell ──────────────────────────────────────────

export function PageShell({ children, breadcrumbs, locale }: PageShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useTranslations("common");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: C.bg,
        color: C.text,
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* ── HEADER ── */}
      <header
        className="border-b sticky top-0 z-40"
        style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <Link
              href="/"
              className="text-base font-bold tracking-wider uppercase"
            >
              WIKIPEFIA
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 border cursor-pointer transition-colors group"
                style={{ borderColor: C.borderLight }}
              >
                <span className="text-xs uppercase font-medium group-hover:underline" style={{ color: C.textMuted }}>
                  {t("search")}
                </span>
                <span
                  className="text-[10px] border px-1 py-px"
                  style={{ borderColor: C.borderLight, color: C.textMuted }}
                >
                  ⌘K
                </span>
              </button>
              <ThemeToggle />
              <LocaleSwitcher currentLocale={locale} />
            </div>
          </div>
        </div>
      </header>

      {/* ── BREADCRUMBS ── */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="border-b"
          style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2 text-[11px] uppercase tracking-wider">
            {breadcrumbs.map((item, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="opacity-30">/</span>}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:underline"
                    style={{ color: C.textMuted }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-bold">{item.label}</span>
                )}
              </Fragment>
            ))}
          </div>
        </nav>
      )}

      {/* ── CONTENT ── */}
      <main className="flex-1">{children}</main>

      {/* ── FOOTER ── */}
      <footer className="border-t mt-auto" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider">
            <div>
              <span className="font-bold">WIKIPEFIA</span>
              <span className="mx-3 opacity-20">·</span>
              <span style={{ color: C.textMuted }}>{t("educationalDatabase")}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/explore"
                className="hover:underline transition-colors"
                style={{ color: C.textMuted }}
              >
                {t("exploreLabel").toUpperCase()}
              </Link>
              <span style={{ color: C.textMuted }}>{t("copyright")}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── SEARCH ── */}
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
