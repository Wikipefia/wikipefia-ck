import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { C, FONT } from "@/lib/theme";

/**
 * Inverted dark top bar carrying the wordmark + actions. Shared by all pages
 * so the app reads as one piece. `actions` slots in page-specific controls
 * (e.g. the Upload button on the home page).
 */
export function Masthead({ actions }: { actions?: ReactNode }) {
  return (
    <header
      className="grain relative z-20 border-b"
      style={{
        backgroundColor: C.headerBg,
        color: C.headerText,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ fontFamily: FONT.mono }}
          >
            Wikipefia
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.28em]"
            style={{ fontFamily: FONT.mono, color: C.accent }}
          >
            Library
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
