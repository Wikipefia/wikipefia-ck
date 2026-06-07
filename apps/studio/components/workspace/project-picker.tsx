"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Modal } from "@wikipefia/ui";
import { C } from "@/lib/theme";
import type { ProjectRecord } from "@/lib/mock-data";

interface ProjectPickerProps {
  projects: ProjectRecord[];
  recentSlugs: string[];
  currentSlug: string | null;
  onSelect: (slug: string) => void;
  onClose: () => void;
}

export function ProjectPicker({
  projects,
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
    if (!q) return projects;
    return projects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.includes(q) ||
        s.githubRepo.toLowerCase().includes(q),
    );
  }, [query, projects]);

  const recentFiltered = useMemo(() => {
    if (query.trim()) return [];
    return recentSlugs
      .filter((slug) => slug !== currentSlug)
      .map((slug) => projects.find((s) => s.slug === slug))
      .filter(Boolean) as ProjectRecord[];
  }, [recentSlugs, currentSlug, query, projects]);

  const allItems = useMemo(() => {
    const items: { slug: string }[] = [];
    for (const s of recentFiltered) items.push({ slug: s.slug });
    for (const s of filtered) items.push({ slug: s.slug });
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
    <Modal open onClose={onClose} align="top" className="max-w-md" zIndex={100}>
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: C.borderLight }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects\u2026"
            className="w-full text-[13px] bg-transparent outline-none"
            style={{ fontFamily: "var(--font-mono)", color: C.text }}
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto py-1">
          {recentFiltered.length > 0 && (
            <>
              <SectionLabel>Recent</SectionLabel>
              {recentFiltered.map((s) => {
                const idx = itemIndex++;
                return (
                  <ProjectRow
                    key={`recent-${s.slug}`}
                    project={s}
                    focused={idx === focusIdx}
                    isCurrent={false}
                    onSelect={() => onSelect(s.slug)}
                    onHover={() => setFocusIdx(idx)}
                  />
                );
              })}
            </>
          )}

          <SectionLabel>
            {query.trim() ? "Results" : "All projects"}
          </SectionLabel>
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
                  project={s}
                  focused={idx === focusIdx}
                  isCurrent={s.slug === currentSlug}
                  onSelect={() => onSelect(s.slug)}
                  onHover={() => setFocusIdx(idx)}
                />
              );
            })
          )}
        </div>

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
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-4 pt-2 pb-1 text-[8px] font-bold uppercase tracking-[0.2em]"
      style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
    >
      {children}
    </div>
  );
}

function ProjectRow({
  project,
  focused,
  isCurrent,
  onSelect,
  onHover,
}: {
  project: ProjectRecord;
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
      style={{ backgroundColor: focused ? C.bg : "transparent" }}
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
            {project.name}
          </div>
          <div
            className="text-[9px] truncate mt-0.5"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            {project.githubRepo}
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
        {project.lastSynced && (
          <span
            className="text-[8px]"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            synced
          </span>
        )}
      </div>
    </button>
  );
}
