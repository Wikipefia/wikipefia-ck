"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { C } from "@/lib/theme";

type CalloutType = "info" | "warning" | "error";

interface CalloutProps {
  type?: CalloutType;
  children: ReactNode;
}

const config: Record<
  CalloutType,
  { border: string; bg: string; icon: string; accent: string; key: string }
> = {
  info: {
    border: "#2563EB",
    bg: "rgba(37, 99, 235, 0.05)",
    icon: "ℹ",
    accent: "#2563EB",
    key: "note",
  },
  warning: {
    border: "#D97706",
    bg: "rgba(217, 119, 6, 0.05)",
    icon: "▲",
    accent: "#D97706",
    key: "warning",
  },
  error: {
    border: "#DC2626",
    bg: "rgba(220, 38, 38, 0.05)",
    icon: "✕",
    accent: "#DC2626",
    key: "danger",
  },
};

export function Callout({ type = "info", children }: CalloutProps) {
  const t = useTranslations("common");
  const c = config[type] || config.info;
  const label = t(c.key);

  return (
    <aside
      className="pb-1 mb-6"
      style={{
        borderLeft: `4px solid ${c.border}`,
        backgroundColor: c.bg,
      }}
    >
      {/* Label strip */}
      <div
        className="flex items-center gap-2 px-4 pt-3"
        style={{ color: c.accent }}
      >
        <span className="text-lg leading-none">{c.icon}</span>
        <span
          className="text-[11px] font-bold tracking-[0.15em] uppercase"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {label}
        </span>
      </div>

      {/* Content */}
      <div
        className="px-4 pt-2 text-[15px] leading-[1.75]"
        style={{ color: C.text, fontFamily: "var(--font-serif)" }}
      >
        {children}
      </div>
    </aside>
  );
}
