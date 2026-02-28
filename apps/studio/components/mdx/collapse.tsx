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
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer"
        style={{ backgroundColor: C.headerBg }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          ■ {title}
        </span>
        <span
          className="text-[14px] transition-transform"
          style={{
            color: C.headerText,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div
          className="px-4 py-4 text-[14px] leading-[1.75] border-t-2"
          style={{
            fontFamily: "var(--font-serif)",
            borderColor: C.border,
            color: C.text,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
