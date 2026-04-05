"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { C } from "@/lib/theme";
import { getArticleTitle, createTabId, type Subject } from "@/lib/mock-data";

interface SidebarProps {
  subject: Subject;
  activeTabId: string | null;
  onOpenFile: (articleSlug: string) => void;
  onOpenMetadata: () => void;
  onCollapse: () => void;
  onCloseProject: () => void;
}

export function Sidebar({
  subject,
  activeTabId,
  onOpenFile,
  onOpenMetadata,
  onCollapse,
  onCloseProject,
}: SidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    setExpandedCategories(new Set(subject.categories.map((c) => c.slug)));
  }, [subject]);

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: C.bg }}>
      {/* Project header */}
      <div
        className="flex items-center border-b shrink-0"
        style={{ borderColor: C.borderLight }}
      >
        <div className="flex-1 min-w-0 px-4 py-2.5">
          <div
            className="text-[9px] font-bold uppercase tracking-[0.15em] mb-0.5"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            Project
          </div>
          <div
            className="text-[12px] font-semibold truncate"
            style={{ fontFamily: "var(--font-mono)", color: C.text }}
          >
            {subject.name.en}
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseProject}
          className="shrink-0 w-8 h-full flex items-center justify-center cursor-pointer transition-colors"
          style={{ color: C.textMuted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#DC2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = C.textMuted;
          }}
          title="Close project"
        >
          <span className="text-[11px]">&times;</span>
        </button>
        <button
          type="button"
          onClick={onCollapse}
          className="shrink-0 w-8 h-full flex items-center justify-center cursor-pointer transition-colors border-l"
          style={{ borderColor: C.borderLight, color: C.textMuted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = C.text;
            e.currentTarget.style.backgroundColor = C.bgWhite;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = C.textMuted;
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Collapse sidebar"
        >
          <span
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            &#x2039;
          </span>
        </button>
      </div>

      {/* Settings link */}
      <button
        type="button"
        onClick={onOpenMetadata}
        className="w-full flex items-center gap-2 px-4 py-2 border-b cursor-pointer transition-colors"
        style={{
          borderColor: C.borderLight,
          backgroundColor:
            activeTabId === `meta:${subject.slug}`
              ? "rgba(37,99,235,0.08)"
              : "transparent",
          borderLeft:
            activeTabId === `meta:${subject.slug}`
              ? `2px solid ${C.accent}`
              : "2px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (activeTabId !== `meta:${subject.slug}`)
            e.currentTarget.style.backgroundColor = C.bgWhite;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            activeTabId === `meta:${subject.slug}`
              ? "rgba(37,99,235,0.08)"
              : "transparent";
        }}
      >
        <span className="text-[11px]" style={{ color: C.textMuted }}>
          &#x2699;
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          Repository Settings
        </span>
      </button>

      {/* File tree */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {subject.categories.map((cat) => {
          const isExpanded = expandedCategories.has(cat.slug);
          return (
            <div key={cat.slug}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.slug)}
                className="w-full flex items-center gap-1.5 px-4 py-1.5 cursor-pointer transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = C.bgWhite;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span
                  className="text-[8px] w-3 text-center"
                  style={{ color: C.textMuted }}
                >
                  {isExpanded ? "\u25BE" : "\u25B8"}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.textMuted,
                  }}
                >
                  {cat.name.en}
                </span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ overflow: "hidden" }}
                  >
                    {cat.articles.map((articleSlug) => {
                      const fileId = createTabId(
                        "article",
                        subject.slug,
                        articleSlug,
                      );
                      const isActive = activeTabId === fileId;
                      return (
                        <button
                          key={articleSlug}
                          type="button"
                          onClick={() => onOpenFile(articleSlug)}
                          className="w-full flex items-center gap-2 pl-8 pr-4 py-1.5 text-left cursor-pointer transition-colors"
                          style={{
                            backgroundColor: isActive
                              ? "rgba(37,99,235,0.08)"
                              : "transparent",
                            borderLeft: isActive
                              ? `2px solid ${C.accent}`
                              : "2px solid transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive)
                              e.currentTarget.style.backgroundColor = C.bgWhite;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isActive
                              ? "rgba(37,99,235,0.08)"
                              : "transparent";
                          }}
                        >
                          <span
                            className="text-[10px]"
                            style={{
                              color: isActive ? C.accent : C.textMuted,
                            }}
                          >
                            &#x25C7;
                          </span>
                          <span
                            className="text-[11px] truncate"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: isActive ? C.text : C.textMuted,
                            }}
                          >
                            {getArticleTitle(articleSlug)}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-4 py-2.5 border-t"
        style={{ borderColor: C.borderLight }}
      >
        <div
          className="text-[9px] tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          {subject.metadata.credits} credits &middot; Semester{" "}
          {subject.metadata.semester}
        </div>
      </div>
    </div>
  );
}
