"use client";

import { useState, useRef, useEffect } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import {
  applyDefaults,
  DEFAULT_MODE_ID,
  type Localized,
  type ModeDefinition,
} from "@wikipefia/chat/modes";
import { IconButton } from "./primitives/IconButton";

export type ModePickerLocale = "en" | "ru";

export interface ModePickerProps {
  /** All visible modes, plus the implicit default (which we render as a "Без режима" reset option). */
  modes: ModeDefinition[];
  /** Currently selected mode id (or DEFAULT_MODE_ID for "no mode"). */
  selectedId: string;
  /** Called when the user picks a mode. Receives the resolved-default settings snapshot. */
  onSelect: (modeId: string, defaults: Record<string, unknown>) => void;
  /** Locale for labels. Defaults to "ru". */
  locale?: ModePickerLocale;
  disabled?: boolean;
}

function loc(s: Localized, locale: ModePickerLocale): string {
  return s[locale] ?? s.en;
}

/**
 * "+" icon trigger that opens a popover listing the available modes.
 * Mirrors `ModelPicker` styling for visual consistency.
 *
 * The default mode is special: it's hidden from the registry (`hidden: true`)
 * but appears here as a "Без режима / Default" reset entry, so the user
 * can return to standard chat after picking a mode.
 */
export function ModePicker({
  modes,
  selectedId,
  onSelect,
  locale = "ru",
  disabled,
}: ModePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selectedMode = modes.find((m) => m.id === selectedId);
  const isDefault = !selectedMode || selectedMode.id === DEFAULT_MODE_ID;

  // Trigger label: just "+" when default, "+ Tutor" when a mode is active.
  const triggerLabel = isDefault
    ? null
    : loc(selectedMode!.label, locale);

  return (
    <div ref={ref} className="relative">
      {triggerLabel ? (
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-label="Mode"
          title={
            locale === "ru"
              ? "Режим взаимодействия"
              : "Interaction mode"
          }
          className="border h-[28px] px-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] disabled:opacity-50 cursor-pointer"
          style={{
            fontFamily: "var(--font-mono)",
            borderColor: C.accent,
            backgroundColor: C.bgWhite,
            color: C.accent,
          }}
        >
          <span>+</span>
          <span>{triggerLabel}</span>
          <span style={{ color: C.textMuted }}>{open ? "▴" : "▾"}</span>
        </button>
      ) : (
        <IconButton
          aria-label={locale === "ru" ? "Выбрать режим" : "Pick mode"}
          size="sm"
          variant="ghost"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          title={
            locale === "ru"
              ? "Режим взаимодействия"
              : "Interaction mode"
          }
        >
          +
        </IconButton>
      )}
      {open ? (
        <div
          className="absolute bottom-full mb-1 left-0 border z-50 min-w-[280px]"
          style={{ borderColor: C.border, backgroundColor: C.bgWhite }}
        >
          <div
            className="px-3 py-2 border-b text-[10px] uppercase tracking-[0.15em]"
            style={{
              borderColor: C.borderLight,
              color: C.textMuted,
              fontFamily: "var(--font-mono)",
              backgroundColor: C.bg,
            }}
          >
            {locale === "ru" ? "Режим взаимодействия" : "Interaction mode"}
          </div>
          {/* "No mode / default" reset entry. */}
          <ModeRow
            label={locale === "ru" ? "Без режима" : "Default"}
            description={
              locale === "ru"
                ? "Свободный диалог с виджетами"
                : "Free-form Q&A with widgets"
            }
            icon="◇"
            selected={isDefault}
            onClick={() => {
              onSelect(DEFAULT_MODE_ID, {});
              setOpen(false);
            }}
          />
          {modes
            .filter((m) => m.id !== DEFAULT_MODE_ID)
            .map((m) => (
              <ModeRow
                key={m.id}
                label={loc(m.label, locale)}
                description={loc(m.description, locale)}
                icon={m.icon}
                selected={m.id === selectedId}
                onClick={() => {
                  onSelect(m.id, applyDefaults(m, null));
                  setOpen(false);
                }}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

function ModeRow({
  label,
  description,
  icon,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 border-b hover:opacity-80 cursor-pointer"
      style={{
        borderColor: C.borderLight,
        backgroundColor: selected ? C.bg : "transparent",
        color: C.text,
      }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-2"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <span style={{ color: selected ? C.accent : C.textMuted }}>
          {selected ? "●" : icon}
        </span>
        {label}
      </div>
      <div
        className="text-[11px] leading-snug mt-1"
        style={{ color: C.textMuted, fontFamily: "var(--font-serif)" }}
      >
        {description}
      </div>
    </button>
  );
}
