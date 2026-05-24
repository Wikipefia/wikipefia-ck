"use client";

import { useState, type ReactNode } from "react";
import { C } from "@/lib/theme";

interface CollapseProps {
  title: string;
  children: ReactNode;
}

export function Collapse({ title, children }: CollapseProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="my-4 border-2"
      style={{
        borderColor: C.border,
        backgroundColor: open ? C.bg : C.bgWhite,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer text-left transition-colors"
      >
        <span
          className="text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ fontFamily: "var(--font-mono)", color: C.text }}
        >
          {title}
        </span>
        <span
          className="text-[14px] transition-transform duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: C.textMuted,
          }}
        >
          ▸
        </span>
      </button>

      {open && (
        <div
          className="px-4 pt-3 text-[14px] leading-[1.75] border-t-2"
          style={{ fontFamily: "var(--font-serif)", borderColor: C.border }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
