"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import type {
  Localized,
  ModeDefinition,
  ModeSetting,
} from "@wikipefia/chat/modes";

export type ModeSettingsLocale = "en" | "ru";

export interface ModeSettingsPanelProps {
  mode: ModeDefinition;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  locale?: ModeSettingsLocale;
  disabled?: boolean;
}

function loc(s: Localized, locale: ModeSettingsLocale): string {
  return s[locale] ?? s.en;
}

/**
 * Declarative renderer for a mode's settings.
 *
 * Switches on `setting.type` to choose a control:
 *   - "enum"    → segmented buttons
 *   - "boolean" → on/off toggle
 *   - "string"  → input or textarea
 *
 * New settings types in the future just need a new branch here, then every
 * mode can use them — no per-mode UI work needed.
 */
export function ModeSettingsPanel({
  mode,
  values,
  onChange,
  locale = "ru",
  disabled,
}: ModeSettingsPanelProps) {
  if (mode.settings.length === 0) return null;
  return (
    <div
      className="px-3 py-2 border-b flex flex-col gap-2"
      style={{
        borderColor: C.borderLight,
        backgroundColor: C.bg,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.15em] flex items-center gap-2"
        style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
      >
        <span>{mode.icon}</span>
        <span>{loc(mode.label, locale)}</span>
        <span style={{ color: C.borderLight }}>·</span>
        <span>{locale === "ru" ? "Настройки" : "Settings"}</span>
      </div>
      {mode.settings.map((s) => (
        <SettingRow
          key={s.key}
          setting={s}
          value={values[s.key] ?? s.defaultValue}
          onChange={(v) => onChange(s.key, v)}
          locale={locale}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function SettingRow({
  setting,
  value,
  onChange,
  locale,
  disabled,
}: {
  setting: ModeSetting;
  value: unknown;
  onChange: (v: unknown) => void;
  locale: ModeSettingsLocale;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[10px] uppercase tracking-[0.1em]"
        style={{ fontFamily: "var(--font-mono)", color: C.text }}
      >
        {loc(setting.label, locale)}
      </label>
      {setting.type === "enum" ? (
        <EnumControl
          setting={setting}
          value={typeof value === "string" ? value : setting.defaultValue}
          onChange={onChange}
          locale={locale}
          disabled={disabled}
        />
      ) : null}
      {setting.type === "boolean" ? (
        <BooleanControl
          value={typeof value === "boolean" ? value : setting.defaultValue}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}
      {setting.type === "string" ? (
        <StringControl
          setting={setting}
          value={typeof value === "string" ? value : setting.defaultValue}
          onChange={onChange}
          locale={locale}
          disabled={disabled}
        />
      ) : null}
      {setting.hint ? (
        <span
          className="text-[10px] leading-snug"
          style={{ color: C.textMuted, fontFamily: "var(--font-serif)" }}
        >
          {loc(setting.hint, locale)}
        </span>
      ) : null}
    </div>
  );
}

function EnumControl({
  setting,
  value,
  onChange,
  locale,
  disabled,
}: {
  setting: Extract<ModeSetting, { type: "enum" }>;
  value: string;
  onChange: (v: string) => void;
  locale: ModeSettingsLocale;
  disabled?: boolean;
}) {
  return (
    <div className="flex border" style={{ borderColor: C.border }}>
      {setting.options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="flex-1 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] cursor-pointer disabled:opacity-50"
            style={{
              fontFamily: "var(--font-mono)",
              borderLeft:
                i === 0 ? "none" : `1px solid ${C.border}`,
              backgroundColor: selected ? C.accent : C.bgWhite,
              color: selected ? "#fff" : C.text,
            }}
          >
            {loc(opt.label, locale)}
          </button>
        );
      })}
    </div>
  );
}

function BooleanControl({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="relative h-[22px] w-[44px] border cursor-pointer disabled:opacity-50"
      style={{
        borderColor: value ? C.accent : C.border,
        backgroundColor: value ? C.accent : C.bgWhite,
        transition: "background-color 0.15s, border-color 0.15s",
      }}
    >
      <span
        className="absolute top-[2px] h-[16px] w-[16px]"
        style={{
          left: value ? "24px" : "2px",
          backgroundColor: value ? "#fff" : C.text,
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

function StringControl({
  setting,
  value,
  onChange,
  locale,
  disabled,
}: {
  setting: Extract<ModeSetting, { type: "string" }>;
  value: string;
  onChange: (v: string) => void;
  locale: ModeSettingsLocale;
  disabled?: boolean;
}) {
  const placeholder = setting.placeholder
    ? loc(setting.placeholder, locale)
    : undefined;
  if (setting.multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="border px-2 py-1 text-[12px] outline-none resize-y disabled:opacity-60"
        style={{
          fontFamily: "var(--font-serif)",
          borderColor: C.border,
          backgroundColor: C.bgWhite,
          color: C.text,
        }}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="border px-2 py-1 text-[12px] outline-none disabled:opacity-60"
      style={{
        fontFamily: "var(--font-serif)",
        borderColor: C.border,
        backgroundColor: C.bgWhite,
        color: C.text,
      }}
    />
  );
}
