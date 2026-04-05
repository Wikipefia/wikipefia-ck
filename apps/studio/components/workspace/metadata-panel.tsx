"use client";

import { useState, useCallback } from "react";
import { C } from "@/lib/theme";
import type { Subject, LocalizedString } from "@/lib/mock-data";

interface MetadataPanelProps {
  subject: Subject;
  onUpdate: (updated: Subject) => void;
}

const LOCALES = ["en", "ru", "cz"] as const;

function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: LocalizedString;
  onChange: (value: LocalizedString) => void;
  multiline?: boolean;
}) {
  return (
    <div className="mb-5">
      <label
        className="block text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
      >
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {LOCALES.map((locale) => (
          <div key={locale}>
            <div
              className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              {locale}
            </div>
            {multiline ? (
              <textarea
                value={value[locale]}
                onChange={(e) =>
                  onChange({ ...value, [locale]: e.target.value })
                }
                rows={3}
                className="w-full px-2.5 py-1.5 text-[12px] border outline-none transition-colors resize-none"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: C.bgWhite,
                  borderColor: C.borderLight,
                  color: C.text,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.borderLight;
                }}
              />
            ) : (
              <input
                value={value[locale]}
                onChange={(e) =>
                  onChange({ ...value, [locale]: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-[12px] border outline-none transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: C.bgWhite,
                  borderColor: C.borderLight,
                  color: C.text,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.borderLight;
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScalarField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label
        className="block text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-[12px] border outline-none transition-colors"
        style={{
          fontFamily: "var(--font-mono)",
          backgroundColor: C.bgWhite,
          borderColor: C.borderLight,
          color: C.text,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = C.accent;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = C.borderLight;
        }}
      />
    </div>
  );
}

export function MetadataPanel({ subject, onUpdate }: MetadataPanelProps) {
  const [local, setLocal] = useState<Subject>(subject);
  const [saved, setSaved] = useState(false);

  const update = useCallback(
    <K extends keyof Subject>(key: K, value: Subject[K]) => {
      setLocal((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    [],
  );

  const updateMeta = useCallback(
    <K extends keyof Subject["metadata"]>(
      key: K,
      value: Subject["metadata"][K],
    ) => {
      setLocal((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, [key]: value },
      }));
      setSaved(false);
    },
    [],
  );

  const handleSave = () => {
    onUpdate(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: C.bgWhite }}>
      <div className="max-w-3xl mx-auto px-8 py-6">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-6 pb-4 border-b"
          style={{ borderColor: C.borderLight }}
        >
          <div>
            <h2
              className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              Repository Settings
            </h2>
            <h1
              className="text-[18px] font-bold"
              style={{ fontFamily: "var(--font-mono)", color: C.text }}
            >
              {subject.name.en}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: saved ? "#059669" : C.accent,
              color: "#fff",
            }}
          >
            {saved ? "\u2713 Saved" : "Save changes"}
          </button>
        </div>

        {/* General */}
        <section className="mb-8">
          <h3
            className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.accent,
              borderColor: C.borderLight,
            }}
          >
            General
          </h3>
          <LocalizedField
            label="Name"
            value={local.name}
            onChange={(v) => update("name", v)}
          />
          <LocalizedField
            label="Description"
            value={local.description}
            onChange={(v) => update("description", v)}
            multiline
          />
        </section>

        {/* Academic */}
        <section className="mb-8">
          <h3
            className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.accent,
              borderColor: C.borderLight,
            }}
          >
            Academic
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <ScalarField
              label="Semester"
              type="number"
              value={local.metadata.semester}
              onChange={(v) => updateMeta("semester", parseInt(v) || 1)}
            />
            <ScalarField
              label="Credits"
              type="number"
              value={local.metadata.credits}
              onChange={(v) => updateMeta("credits", parseInt(v) || 1)}
            />
            <div>
              <label
                className="block text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: C.textMuted,
                }}
              >
                Difficulty
              </label>
              <select
                value={local.metadata.difficulty}
                onChange={(e) =>
                  updateMeta(
                    "difficulty",
                    e.target.value as Subject["metadata"]["difficulty"],
                  )
                }
                className="w-full px-2.5 py-1.5 text-[12px] border outline-none cursor-pointer transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: C.bgWhite,
                  borderColor: C.borderLight,
                  color: C.text,
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <LocalizedField
            label="Department"
            value={local.metadata.department}
            onChange={(v) => updateMeta("department", v)}
          />
        </section>

        {/* Team */}
        <section className="mb-8">
          <h3
            className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.accent,
              borderColor: C.borderLight,
            }}
          >
            Team
          </h3>
          <div className="space-y-2">
            {local.teachers.map((teacher, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={teacher}
                  onChange={(e) => {
                    const next = [...local.teachers];
                    next[i] = e.target.value;
                    update("teachers", next);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-[12px] border outline-none transition-colors"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: C.bgWhite,
                    borderColor: C.borderLight,
                    color: C.text,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = C.accent;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = C.borderLight;
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "teachers",
                      local.teachers.filter((_, j) => j !== i),
                    )
                  }
                  className="w-6 h-6 flex items-center justify-center text-[11px] cursor-pointer transition-colors"
                  style={{ color: C.textMuted }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#DC2626";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = C.textMuted;
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => update("teachers", [...local.teachers, ""])}
              className="text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1 cursor-pointer transition-colors border"
              style={{
                fontFamily: "var(--font-mono)",
                color: C.accent,
                borderColor: C.accent,
              }}
            >
              + Add Teacher
            </button>
          </div>
        </section>

        {/* Categories (read-only overview) */}
        <section className="mb-8">
          <h3
            className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.accent,
              borderColor: C.borderLight,
            }}
          >
            Categories
          </h3>
          <div className="space-y-3">
            {local.categories.map((cat) => (
              <div
                key={cat.slug}
                className="p-3 border"
                style={{ borderColor: C.borderLight }}
              >
                <div
                  className="text-[11px] font-semibold mb-1"
                  style={{ fontFamily: "var(--font-mono)", color: C.text }}
                >
                  {cat.name.en}
                </div>
                <div
                  className="text-[9px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.textMuted,
                  }}
                >
                  {cat.articles.length} article
                  {cat.articles.length !== 1 ? "s" : ""} &middot;{" "}
                  {cat.articles.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
