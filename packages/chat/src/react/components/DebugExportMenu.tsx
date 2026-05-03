"use client";

import { useState, useRef, useEffect } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import { useExportThread } from "../hooks/use-export";
import type { ExportFormat } from "../../types";
import { IconButton } from "./primitives/IconButton";

interface DebugExportMenuProps {
  threadId: string;
}

const FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: "json", label: "JSON", description: "Full structured dump" },
  { id: "markdown", label: "Markdown", description: "Human-readable transcript" },
  { id: "replay", label: "Replay JSON", description: "Re-feedable to generateText" },
];

export function DebugExportMenu({ threadId }: DebugExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const exportThread = useExportThread();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label="Debug export"
        title="Debug — download thread"
        size="sm"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
      >
        ⬇
      </IconButton>
      {open ? (
        <div
          className="absolute top-full mt-1 right-0 border z-50 min-w-[220px]"
          style={{ borderColor: C.border, backgroundColor: C.bgWhite }}
        >
          <div
            className="px-3 py-1.5 border-b text-[10px] font-bold uppercase tracking-wider"
            style={{
              borderColor: C.borderLight,
              backgroundColor: C.headerBg,
              color: C.headerText,
              fontFamily: "var(--font-mono)",
            }}
          >
            Export thread
          </div>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={async () => {
                setOpen(false);
                await exportThread(threadId, f.id);
              }}
              className="w-full text-left px-3 py-2 border-b hover:opacity-80 cursor-pointer"
              style={{ borderColor: C.borderLight, color: C.text }}
            >
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {f.label}
              </div>
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
              >
                {f.description}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
