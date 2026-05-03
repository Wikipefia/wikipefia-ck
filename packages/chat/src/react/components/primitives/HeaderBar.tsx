"use client";

import type { ReactNode } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";

/**
 * Inverted-surface header used in MDX widget cards and chat message headers.
 * Matches the Wikipefia brutalist design system.
 */
export interface HeaderBarProps {
  icon?: string;
  title: string;
  right?: ReactNode;
}

export function HeaderBar({ icon, title, right }: HeaderBarProps) {
  return (
    <div
      className="px-4 py-2.5 border-b-2 flex items-center justify-between"
      style={{ borderColor: C.border, backgroundColor: C.headerBg }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
      >
        {icon ? `${icon} ` : "■ "}
        {title}
      </span>
      {right ? (
        <span style={{ color: C.headerText }} className="flex items-center gap-2">
          {right}
        </span>
      ) : null}
    </div>
  );
}
