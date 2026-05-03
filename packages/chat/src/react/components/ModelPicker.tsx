"use client";

import { useState, useRef, useEffect } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import type { ModelDef } from "../../types";

interface ModelPickerProps {
  models: ModelDef[];
  currentId: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelPicker({
  models,
  currentId,
  onSelect,
  disabled,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = models.find((m) => m.id === currentId) ?? models[0];

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
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="border h-[34px] px-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] disabled:opacity-50 cursor-pointer"
        style={{
          fontFamily: "var(--font-mono)",
          borderColor: C.border,
          backgroundColor: C.bgWhite,
          color: C.text,
        }}
      >
        <span style={{ color: C.textMuted }}>◇</span>
        {current.label}
        <span style={{ color: C.textMuted }}>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div
          className="absolute top-full mt-1 right-0 border z-50 min-w-[260px]"
          style={{ borderColor: C.border, backgroundColor: C.bgWhite }}
        >
          {models.map((m) => {
            const selected = m.id === currentId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 border-b hover:opacity-80 cursor-pointer"
                style={{
                  borderColor: C.borderLight,
                  backgroundColor: selected ? C.bg : "transparent",
                  color: C.text,
                }}
              >
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.1em]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {selected ? "● " : "○ "}
                  {m.label}
                </div>
                <div
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
                >
                  {m.provider} · {m.contextWindow.toLocaleString()} ctx
                  {m.supportsImages ? " · 🖼" : ""}
                  {m.supportsPDF ? " · 📄" : ""}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
