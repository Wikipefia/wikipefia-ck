"use client";

import { Label, Select, Input as UIInput } from "@wikipefia/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { C } from "@/lib/theme";

interface Frontmatter {
  title?: { ru?: string; en?: string; cz?: string };
  slug?: string;
  author?: string;
  keywords?: { ru?: string[]; en?: string[]; cz?: string[] };
  created?: string;
  updated?: string;
  difficulty?: string;
  estimatedReadTime?: number;
  prerequisites?: string[];
  tutors?: string[];
}

interface FrontmatterPanelProps {
  source: string;
  onSourceChange: (newSource: string) => void;
}

const FIELD_DESCRIPTIONS: Record<string, string> = {
  title: "Article title in three languages",
  slug: "URL-safe identifier (lowercase, hyphens only)",
  author: "Teacher slug who authored this article",
  keywords: "Search keywords in three languages",
  created: "Creation date (ISO format)",
  updated: "Last update date (ISO format)",
  difficulty: "Content difficulty level",
  estimatedReadTime: "Reading time in minutes",
  prerequisites: "Slugs of articles to read first",
  tutors: "Teacher slugs who can help with this topic",
};

/** Extract raw frontmatter string and parsed object from MDX source */
function parseFrontmatter(source: string): {
  raw: string;
  data: Frontmatter;
  body: string;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { raw: "", data: {}, body: source };

  const raw = match[1];
  const body = source.slice(match[0].length);
  const data: Frontmatter = {};

  try {
    // Simple YAML parser for our known structure
    const lines = raw.split("\n");
    let currentKey = "";
    let currentSubKey = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const topMatch = line.match(/^(\w+):\s*(.*)/);
      const subMatch = line.match(/^\s{2,4}(\w+):\s*(.*)/);
      const listMatch = line.match(/^\s{2,8}-\s*"?([^"]*)"?\s*$/);

      if (topMatch && !line.startsWith(" ")) {
        currentKey = topMatch[1];
        currentSubKey = "";
        const val = topMatch[2].trim().replace(/^"(.*)"$/, "$1");

        if (val && !val.includes("[")) {
          if (currentKey === "estimatedReadTime") {
            (data as Record<string, unknown>)[currentKey] = Number(val);
          } else {
            (data as Record<string, unknown>)[currentKey] = val;
          }
        } else if (val.startsWith("[")) {
          // inline array
          const items =
            val.match(/"([^"]*)"/g)?.map((s) => s.replace(/"/g, "")) ?? [];
          (data as Record<string, unknown>)[currentKey] = items;
        }
      } else if (subMatch) {
        currentSubKey = subMatch[1];
        const val = subMatch[2].trim().replace(/^"(.*)"$/, "$1");

        if (!data[currentKey as keyof Frontmatter]) {
          (data as Record<string, unknown>)[currentKey] = {};
        }
        const parent = data[currentKey as keyof Frontmatter] as Record<
          string,
          unknown
        >;

        if (val.startsWith("[")) {
          parent[currentSubKey] =
            val.match(/"([^"]*)"/g)?.map((s) => s.replace(/"/g, "")) ?? [];
        } else if (val) {
          parent[currentSubKey] = val;
        }
      } else if (listMatch) {
        const val = listMatch[1].trim().replace(/^"(.*)"$/, "$1");
        if (currentSubKey) {
          const parent = data[currentKey as keyof Frontmatter] as Record<
            string,
            unknown
          >;
          if (!Array.isArray(parent[currentSubKey])) parent[currentSubKey] = [];
          (parent[currentSubKey] as string[]).push(val);
        } else {
          if (!Array.isArray(data[currentKey as keyof Frontmatter])) {
            (data as Record<string, unknown>)[currentKey] = [];
          }
          (data[currentKey as keyof Frontmatter] as string[]).push(val);
        }
      }
    }
  } catch {
    // If parsing fails, return empty data
  }

  return { raw, data, body };
}

/** Serialize frontmatter object back to YAML string */
function serializeFrontmatter(data: Frontmatter): string {
  const lines: string[] = [];

  if (data.title) {
    lines.push("title:");
    if (data.title.ru) lines.push(`  ru: "${data.title.ru}"`);
    if (data.title.en) lines.push(`  en: "${data.title.en}"`);
    if (data.title.cz) lines.push(`  cz: "${data.title.cz}"`);
  }
  if (data.slug) lines.push(`slug: "${data.slug}"`);
  if (data.author) lines.push(`author: "${data.author}"`);
  if (data.keywords) {
    lines.push("keywords:");
    for (const locale of ["ru", "en", "cz"] as const) {
      const kw = data.keywords[locale];
      if (kw?.length) {
        lines.push(`  ${locale}: [${kw.map((k) => `"${k}"`).join(", ")}]`);
      }
    }
  }
  if (data.created) lines.push(`created: "${data.created}"`);
  if (data.updated) lines.push(`updated: "${data.updated}"`);
  if (data.difficulty) lines.push(`difficulty: "${data.difficulty}"`);
  if (data.estimatedReadTime != null)
    lines.push(`estimatedReadTime: ${data.estimatedReadTime}`);
  if (data.prerequisites?.length) {
    lines.push("prerequisites:");
    for (const p of data.prerequisites) lines.push(`  - "${p}"`);
  }
  if (data.tutors?.length) {
    lines.push("tutors:");
    for (const t of data.tutors) lines.push(`  - "${t}"`);
  }

  return lines.join("\n");
}

export function FrontmatterPanel({
  source,
  onSourceChange,
}: FrontmatterPanelProps) {
  const [open, setOpen] = useState(false);

  const { data, body } = useMemo(() => parseFrontmatter(source), [source]);
  const hasFrontmatter = source.trimStart().startsWith("---");

  const update = useCallback(
    (fn: (prev: Frontmatter) => Frontmatter) => {
      const next = fn(data);
      const yaml = serializeFrontmatter(next);
      onSourceChange(`---\n${yaml}\n---\n${body}`);
    },
    [data, body, onSourceChange],
  );

  const updateLocalized = useCallback(
    (field: "title", locale: "ru" | "en" | "cz", value: string) => {
      update((prev) => ({
        ...prev,
        [field]: { ...prev[field], [locale]: value },
      }));
    },
    [update],
  );

  const updateKeywords = useCallback(
    (locale: "ru" | "en" | "cz", value: string) => {
      update((prev) => ({
        ...prev,
        keywords: {
          ...prev.keywords,
          [locale]: value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }));
    },
    [update],
  );

  if (!hasFrontmatter) return null;

  return (
    <div className="shrink-0 border-b" style={{ borderColor: C.borderLight }}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors"
        style={{ backgroundColor: C.bg }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = C.bgWhite;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = C.bg;
        }}
      >
        <span className="text-[8px]" style={{ color: C.textMuted }}>
          {open ? "\u25BE" : "\u25B8"}
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          Frontmatter
        </span>
        {!open && data.title?.en && (
          <span
            className="text-[9px] truncate ml-2"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.textMuted,
              opacity: 0.6,
            }}
          >
            {data.title.en}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-4 py-3 space-y-3 max-h-[280px] overflow-y-auto"
              style={{ backgroundColor: C.bgWhite }}
            >
              {/* Title */}
              <FieldGroup label="title" description={FIELD_DESCRIPTIONS.title}>
                <div className="grid grid-cols-3 gap-2">
                  {(["en", "ru", "cz"] as const).map((locale) => (
                    <LocaleInput
                      key={locale}
                      locale={locale}
                      value={data.title?.[locale] ?? ""}
                      onChange={(v) => updateLocalized("title", locale, v)}
                    />
                  ))}
                </div>
              </FieldGroup>

              {/* Slug + Author row */}
              <div className="grid grid-cols-3 gap-2">
                <FieldGroup label="slug" description={FIELD_DESCRIPTIONS.slug}>
                  <Input
                    value={data.slug ?? ""}
                    onChange={(v) => update((p) => ({ ...p, slug: v }))}
                    placeholder="article-slug"
                  />
                </FieldGroup>
                <FieldGroup
                  label="author"
                  description={FIELD_DESCRIPTIONS.author}
                >
                  <Input
                    value={data.author ?? ""}
                    onChange={(v) =>
                      update((p) => ({ ...p, author: v || undefined }))
                    }
                    placeholder="teacher-slug"
                  />
                </FieldGroup>
                <FieldGroup
                  label="difficulty"
                  description={FIELD_DESCRIPTIONS.difficulty}
                >
                  <Select
                    size="sm"
                    value={data.difficulty ?? ""}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        difficulty: e.target.value || undefined,
                      }))
                    }
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <option value="">—</option>
                    <option value="beginner">beginner</option>
                    <option value="intermediate">intermediate</option>
                    <option value="advanced">advanced</option>
                  </Select>
                </FieldGroup>
              </div>

              {/* Dates + read time */}
              <div className="grid grid-cols-3 gap-2">
                <FieldGroup
                  label="created"
                  description={FIELD_DESCRIPTIONS.created}
                >
                  <Input
                    type="date"
                    value={data.created ?? ""}
                    onChange={(v) => update((p) => ({ ...p, created: v }))}
                  />
                </FieldGroup>
                <FieldGroup
                  label="updated"
                  description={FIELD_DESCRIPTIONS.updated}
                >
                  <Input
                    type="date"
                    value={data.updated ?? ""}
                    onChange={(v) =>
                      update((p) => ({ ...p, updated: v || undefined }))
                    }
                  />
                </FieldGroup>
                <FieldGroup
                  label="estimatedReadTime"
                  description={FIELD_DESCRIPTIONS.estimatedReadTime}
                >
                  <Input
                    type="number"
                    value={String(data.estimatedReadTime ?? "")}
                    onChange={(v) =>
                      update((p) => ({
                        ...p,
                        estimatedReadTime: v ? Number(v) : undefined,
                      }))
                    }
                    placeholder="min"
                  />
                </FieldGroup>
              </div>

              {/* Keywords */}
              <FieldGroup
                label="keywords"
                description={FIELD_DESCRIPTIONS.keywords}
              >
                <div className="grid grid-cols-3 gap-2">
                  {(["en", "ru", "cz"] as const).map((locale) => (
                    <LocaleInput
                      key={locale}
                      locale={locale}
                      value={data.keywords?.[locale]?.join(", ") ?? ""}
                      onChange={(v) => updateKeywords(locale, v)}
                      placeholder="comma, separated"
                    />
                  ))}
                </div>
              </FieldGroup>

              {/* Prerequisites */}
              <FieldGroup
                label="prerequisites"
                description={FIELD_DESCRIPTIONS.prerequisites}
              >
                <Input
                  value={data.prerequisites?.join(", ") ?? ""}
                  onChange={(v) =>
                    update((p) => ({
                      ...p,
                      prerequisites: v
                        ? v
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : undefined,
                    }))
                  }
                  placeholder="slug-1, slug-2"
                />
              </FieldGroup>

              {/* Tutors */}
              <FieldGroup
                label="tutors"
                description={FIELD_DESCRIPTIONS.tutors}
              >
                <Input
                  value={data.tutors?.join(", ") ?? ""}
                  onChange={(v) =>
                    update((p) => ({
                      ...p,
                      tutors: v
                        ? v
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : undefined,
                    }))
                  }
                  placeholder="teacher-slug-1, teacher-slug-2"
                />
              </FieldGroup>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldGroup({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <Label size="sm" className="text-[9px] tracking-[0.1em]">
          {label}
        </Label>
        <span
          className="text-[8px] tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: C.textMuted,
            opacity: 0.5,
          }}
        >
          {description}
        </span>
      </div>
      {children}
    </div>
  );
}

function LocaleInput({
  locale,
  value,
  onChange,
  placeholder,
}: {
  locale: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label size="sm" className="text-[7px] tracking-[0.2em] mb-0.5">
        {locale}
      </Label>
      <UIInput
        size="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ fontFamily: "var(--font-mono)" }}
      />
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <UIInput
      size="sm"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ fontFamily: "var(--font-mono)" }}
    />
  );
}
