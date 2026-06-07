"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { C } from "@/lib/theme";

const mono: CSSProperties = { fontFamily: "var(--font-mono)" };

// ── Page header ──

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1
          className="text-[18px] font-bold uppercase tracking-[0.06em]"
          style={{ ...mono, color: C.text }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[10px] mt-1 tracking-wider"
            style={{ ...mono, color: C.textMuted }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ── Button ──

type BtnVariant = "primary" | "ghost" | "danger";

export function Btn({
  variant = "ghost",
  children,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base: CSSProperties = {
    ...mono,
    ...style,
  };
  const palette: Record<BtnVariant, CSSProperties> = {
    primary: { backgroundColor: C.accent, color: "#fff", border: "none" },
    ghost: {
      backgroundColor: "transparent",
      color: C.textMuted,
      border: `1px solid ${C.borderLight}`,
    },
    danger: {
      backgroundColor: "transparent",
      color: "#DC2626",
      border: "1px solid #DC2626",
    },
  };
  return (
    <button
      type="button"
      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ ...base, ...palette[variant] }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Panel / card ──

export function Panel({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`border ${className}`}
      style={{
        borderColor: C.borderLight,
        backgroundColor: C.bgWhite,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Stat tile ──

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <Panel className="px-4 py-3.5">
      <div
        className="text-[24px] font-bold leading-none"
        style={{ ...mono, color: accent ? C.accent : C.text }}
      >
        {value}
      </div>
      <div
        className="text-[8px] font-bold uppercase tracking-[0.15em] mt-2"
        style={{ ...mono, color: C.textMuted }}
      >
        {label}
      </div>
    </Panel>
  );
}

// ── Badge ──

export function Badge({
  children,
  color = C.textMuted,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 border"
      style={{ ...mono, color, borderColor: color }}
    >
      {children}
    </span>
  );
}

// ── Empty / coming-soon state ──

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="text-[48px] leading-none mb-4"
        style={{ ...mono, color: C.textMuted, opacity: 0.15 }}
      >
        &#x25C7;
      </div>
      <p
        className="text-[11px] font-bold uppercase tracking-[0.2em]"
        style={{ ...mono, color: C.textMuted }}
      >
        {title}
      </p>
      {hint && (
        <p
          className="text-[10px] tracking-wider mt-2 max-w-sm"
          style={{ ...mono, color: C.textMuted, opacity: 0.7 }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
