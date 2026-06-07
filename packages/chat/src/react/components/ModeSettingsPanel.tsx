"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import {
  Field,
  Input,
  SegmentedControl,
  Switch,
  Textarea,
} from "@wikipefia/ui";
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
    <Field
      label={loc(setting.label, locale)}
      hint={setting.hint ? loc(setting.hint, locale) : undefined}
    >
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
    </Field>
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
    <SegmentedControl
      size="sm"
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={setting.options.map((opt) => ({
        value: opt.value,
        label: loc(opt.label, locale),
      }))}
    />
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
    <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
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
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="resize-y"
        style={{ fontFamily: "var(--font-serif)" }}
      />
    );
  }
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ fontFamily: "var(--font-serif)" }}
    />
  );
}
