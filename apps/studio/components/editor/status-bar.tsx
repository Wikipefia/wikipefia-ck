"use client";

import { C } from "@/lib/theme";

export type CompileStatus = "idle" | "compiling" | "success" | "error";

interface StatusBarProps {
  status: CompileStatus;
  error?: string | null;
  diagnosticsCount?: number;
  lineCount?: number;
  scrollSync?: boolean;
  onToggleScrollSync?: () => void;
}

const statusConfig: Record<
  CompileStatus,
  { icon: string; label: string; color: string }
> = {
  idle: { icon: "○", label: "IDLE", color: "var(--c-text-muted)" },
  compiling: { icon: "◌", label: "COMPILING", color: "var(--c-accent)" },
  success: { icon: "●", label: "COMPILED", color: "#059669" },
  error: { icon: "✕", label: "ERROR", color: "#DC2626" },
};

export function StatusBar({
  status,
  error,
  diagnosticsCount = 0,
  lineCount = 0,
  scrollSync,
  onToggleScrollSync,
}: StatusBarProps) {
  const cfg = statusConfig[status];

  return (
    <div
      className="h-7 flex items-center justify-between px-4 border-t shrink-0"
      style={{
        borderColor: C.borderLight,
        backgroundColor: C.bg,
        fontFamily: "var(--font-mono)",
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[12px]"
            style={{ color: cfg.color }}
          >
            {cfg.icon}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.15em]"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>

        {diagnosticsCount > 0 && (
          <span
            className="text-[9px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "#D97706" }}
          >
            {diagnosticsCount} WARNING{diagnosticsCount !== 1 ? "S" : ""}
          </span>
        )}

        {error && status === "error" && (
          <span
            className="text-[9px] tracking-wider truncate max-w-[400px]"
            style={{ color: "#DC2626" }}
          >
            {error}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {onToggleScrollSync && (
          <button
            type="button"
            onClick={onToggleScrollSync}
            className="text-[9px] font-bold uppercase tracking-[0.1em] cursor-pointer transition-colors"
            style={{ color: scrollSync ? C.accent : C.textMuted }}
            title={scrollSync ? "Disable scroll sync" : "Enable scroll sync"}
          >
            {scrollSync ? "⇅ Sync" : "⇅ Sync"}
          </button>
        )}
        {lineCount > 0 && (
          <span
            className="text-[9px] uppercase tracking-[0.1em]"
            style={{ color: C.textMuted }}
          >
            {lineCount} lines
          </span>
        )}
        <span
          className="text-[9px] uppercase tracking-[0.1em]"
          style={{ color: C.textMuted }}
        >
          MDX
        </span>
      </div>
    </div>
  );
}
