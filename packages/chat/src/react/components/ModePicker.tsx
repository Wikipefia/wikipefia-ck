"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import {
  applyDefaults,
  DEFAULT_MODE_ID,
  type Localized,
  type ModeDefinition,
} from "@wikipefia/chat/modes";
import { Button, IconButton, Menu, MenuItem } from "@wikipefia/ui";

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
  const selectedMode = modes.find((m) => m.id === selectedId);
  const isDefault = !selectedMode || selectedMode.id === DEFAULT_MODE_ID;

  // Trigger label: just "+" when default, "+ Tutor" when a mode is active.
  const triggerLabel = isDefault ? null : loc(selectedMode!.label, locale);

  const title =
    locale === "ru" ? "Режим взаимодействия" : "Interaction mode";

  return (
    <Menu
      align="left"
      // Opens upward (the picker sits at the bottom of the composer).
      className="top-auto bottom-full mb-1 min-w-[280px]"
      trigger={({ open, toggle }) =>
        triggerLabel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => !disabled && toggle()}
            disabled={disabled}
            aria-label="Mode"
            title={title}
            style={{ borderColor: C.accent, color: C.accent }}
          >
            <span>+</span>
            <span>{triggerLabel}</span>
            <span style={{ color: C.textMuted }}>{open ? "▴" : "▾"}</span>
          </Button>
        ) : (
          <IconButton
            aria-label={locale === "ru" ? "Выбрать режим" : "Pick mode"}
            size="icon-sm"
            variant="ghost"
            onClick={() => !disabled && toggle()}
            disabled={disabled}
            title={title}
          >
            +
          </IconButton>
        )
      }
    >
      {({ close }) => (
        <>
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
              close();
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
                  close();
                }}
              />
            ))}
        </>
      )}
    </Menu>
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
    <MenuItem selected={selected} onClick={onClick} style={{ color: C.text }}>
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
    </MenuItem>
  );
}
