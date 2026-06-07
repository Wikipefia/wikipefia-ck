"use client";

import { Card, EmptyState, font, Label } from "@wikipefia/ui";
import type { ReactNode } from "react";

/**
 * Admin-specific layout bits with no direct equivalent in @wikipefia/ui.
 * Everything else (Button, Card, Badge, Modal, Field, Input, Select,
 * SegmentedControl, EmptyState, ThemeToggle, …) comes from the shared library.
 */

const mono = { fontFamily: font.mono } as const;

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
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1
          className="text-[18px] font-bold uppercase tracking-[0.06em] text-fg"
          style={mono}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-1 text-[10px] tracking-wider text-muted"
            style={mono}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ── Empty / coming-soon state (title + hint over the shared EmptyState) ──

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <EmptyState className="py-20">
      <div className="text-[11px] font-bold tracking-[0.2em]">{title}</div>
      {hint && (
        <div
          className="mx-auto mt-2 max-w-sm text-[10px] normal-case tracking-wider opacity-70"
          style={{ fontFamily: font.serif }}
        >
          {hint}
        </div>
      )}
    </EmptyState>
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
    <Card className="px-4 py-3.5">
      <div
        className={`text-[24px] font-bold leading-none ${accent ? "text-accent" : "text-fg"}`}
        style={mono}
      >
        {value}
      </div>
      <Label className="mt-2 text-[8px] tracking-[0.15em]">{label}</Label>
    </Card>
  );
}
