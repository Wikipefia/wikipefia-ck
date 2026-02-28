"use client";

import type { ReactNode } from "react";
import { C } from "@/lib/theme";

interface StubBlockProps {
  name: string;
  children?: ReactNode;
  [key: string]: unknown;
}

export function StubBlock({ name, children }: StubBlockProps) {
  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      <div
        className="px-4 py-2.5 border-b-2"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          ■ {name}
        </span>
      </div>
      <div
        className="p-4 text-[14px] leading-[1.75]"
        style={{ fontFamily: "var(--font-serif)", color: C.text }}
      >
        {children}
      </div>
    </div>
  );
}

export function createStubBlock(name: string) {
  function Stub({ children, ...rest }: { children?: ReactNode; [k: string]: unknown }) {
    const meta = Object.entries(rest)
      .filter(([k]) => typeof rest[k] === "string" || typeof rest[k] === "number")
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");

    return (
      <div className="mb-6 border-2" style={{ borderColor: C.border }}>
        <div
          className="px-4 py-2.5 border-b-2 flex items-center gap-3"
          style={{ borderColor: C.border, backgroundColor: C.headerBg }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ■ {name}
          </span>
          {meta && (
            <span
              className="text-[9px] tracking-wider opacity-60"
              style={{ fontFamily: "var(--font-editor)", color: C.headerText }}
            >
              {meta}
            </span>
          )}
        </div>
        <div
          className="p-4 text-[14px] leading-[1.75]"
          style={{ fontFamily: "var(--font-serif)", color: C.text }}
        >
          {children}
        </div>
      </div>
    );
  }
  Stub.displayName = name;
  return Stub;
}

export function createStubInline(name: string) {
  function Stub({ children, ...rest }: { children?: ReactNode; [k: string]: unknown }) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[12px] border"
        style={{
          borderColor: C.borderLight,
          backgroundColor: C.bg,
          fontFamily: "var(--font-mono)",
          color: C.textMuted,
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">
          {name}
        </span>
        {children}
      </span>
    );
  }
  Stub.displayName = name;
  return Stub;
}
