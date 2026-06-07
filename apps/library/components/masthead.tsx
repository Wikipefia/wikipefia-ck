"use client";

import { Button, ThemeToggle } from "@wikipefia/ui";
import Link from "next/link";
import { FONT } from "@/lib/theme";

/**
 * Inverted dark top bar carrying the wordmark + actions. Shared by all pages
 * so the app reads as one piece. `onUpload`, when provided, renders the Upload
 * action button.
 */
export function Masthead({ onUpload }: { onUpload?: () => void }) {
  return (
    <header className="noise-overlay relative z-20 border-b border-white/10 bg-invert text-invert-fg">
      <div className="relative z-10 mx-auto flex h-12 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ fontFamily: FONT.mono }}
          >
            Wikipefia
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.28em] text-accent"
            style={{ fontFamily: FONT.mono }}
          >
            Library
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {onUpload && (
            <Button
              size="sm"
              onClick={onUpload}
              className="border-accent bg-accent text-white hover:opacity-80"
            >
              + Upload
            </Button>
          )}
          <ThemeToggle
            size="icon-sm"
            className="border-white/25 text-invert-fg hover:border-accent hover:text-accent"
          />
        </div>
      </div>
    </header>
  );
}
