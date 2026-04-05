"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { C } from "@/lib/theme";
import { MOCK_SUBJECTS } from "@/lib/mock-data";

interface ProjectPickerProps {
  recentSlugs: string[];
  currentSlug: string | null;
  onSelect: (slug: string) => void;
  onClose: () => void;
}

export function ProjectPicker({
  recentSlugs,
  currentSlug,
  onSelect,
  onClose,
}: ProjectPickerProps) {
  const [query, setQuery] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return MOCK_SUBJECTS;
    return MOCK_SUBJECTS.filter(
      (s) =>
        s.name.en.toLowerCase().includes(q) ||
        s.name.ru.toLowerCase().includes(q) ||
        s.slug.includes(q),
    );
  }, [query]);

  const recentFiltered = useMemo(() => {
    if (query.trim()) return [];
    return recentSlugs
      .filter((slug) => slug !== currentSlug)
      .map((slug) => MOCK_SUBJECTS.find((s) => s.slug === slug))
      .filter(Boolean) as (typeof MOCK_SUBJECTS)[number][];
  }, [recentSlugs, currentSlug, query]);

  // Total items for keyboard nav: recent + filtered
  const allItems = useMemo(() => {
    const items: { slug: string; section: "recent" | "all" }[] = [];
    for (const s of recentFiltered) items.push({ slug: s.slug, section: "recent" });
    for (const s of filtered) items.push({ slug: s.slug, section: "all" });
    return items;
  }, [recentFiltered, filtered]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setFocusIdx(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[focusIdx];
        if (item) onSelect(item.slug);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [allItems, focusIdx, onClose, onSelect]);

  let itemIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.12 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="relative w-full max-w-md border shadow-2xl"
        style={{
          backgroundColor: C.bgWhite,
          borderColor: C.border,
        }}
      >
        {/* Search input */}
        <div className="px-4 py-3 border-b" style={{ borderColor: C.borderLight }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects\u2026"
            className="w-full text-[13px] bg-transparent outline-none"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.text,
            }}
          />
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-1">
          {/* Recent section */}
          {recentFiltered.length > 0 && (
            <>
              <div
                className="px-4 pt-2 pb-1 text-[8px] font-bold uppercase tracking-[0.2em]"
                style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
              >
                Recent
              </div>
              {recentFiltered.map((s) => {
                const idx = itemIndex++;
                return (
                  <ProjectRow
                    key={`recent-${s.slug}`}
                    subject={s}
                    focused={idx === focusIdx}
                    isCurrent={false}
                    onSelect={() => onSelect(s.slug)}
                    onHover={() => setFocusIdx(idx)}
                  />
                );
              })}
            </>
          )}

          {/* All projects */}
          <div
            className="px-4 pt-2 pb-1 text-[8px] font-bold uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            {query.trim() ? "Results" : "All projects"}
          </div>
          {filtered.length === 0 ? (
            <div
              className="px-4 py-3 text-[11px]"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              No projects found
            </div>
          ) : (
            filtered.map((s) => {
              const idx = itemIndex++;
              return (
                <ProjectRow
                  key={`all-${s.slug}`}
                  subject={s}
                  focused={idx === focusIdx}
                  isCurrent={s.slug === currentSlug}
                  onSelect={() => onSelect(s.slug)}
                  onHover={() => setFocusIdx(idx)}
                />
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          className="px-4 py-2 border-t flex items-center gap-3"
          style={{ borderColor: C.borderLight }}
        >
          <span
            className="text-[9px] tracking-wider"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            &uarr;&darr; navigate &middot; &#x23CE; open &middot; esc close
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function ProjectRow({
  subject,
  focused,
  isCurrent,
  onSelect,
  onHover,
}: {
  subject: (typeof MOCK_SUBJECTS)[number];
  focused: boolean;
  isCurrent: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className="w-full flex items-center justify-between px-4 py-2 text-left cursor-pointer transition-colors"
      style={{
        backgroundColor: focused ? C.bg : "transparent",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-1.5 h-1.5 shrink-0"
          style={{
            backgroundColor: isCurrent ? C.accent : "transparent",
            border: isCurrent ? "none" : `1px solid ${C.border}`,
          }}
        />
        <div className="min-w-0">
          <div
            className="text-[12px] font-medium truncate"
            style={{ fontFamily: "var(--font-mono)", color: C.text }}
          >
            {subject.name.en}
          </div>
          <div
            className="text-[9px] truncate mt-0.5"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            {subject.description.en}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {isCurrent && (
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.accent,
              border: `1px solid ${C.accent}`,
            }}
          >
            Open
          </span>
        )}
        <span
          className="text-[9px]"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          {subject.metadata.credits}cr &middot; S{subject.metadata.semester}
        </span>
      </div>
    </button>
  );
}
