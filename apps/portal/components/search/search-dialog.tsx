"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSearch } from "./search-provider";
import { C } from "@/lib/theme";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  subject: "SUBJ",
  teacher: "TCHR",
  "subject-article": "ART",
  "teacher-article": "ART",
  "system-article": "SYS",
};

const TYPE_COLORS: Record<string, string> = {
  subject: "#6366F1",
  teacher: "#059669",
  "subject-article": "#D97706",
  "teacher-article": "#D97706",
  "system-article": "#2563EB",
};

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const { search, isReady } = useSearch();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const t = useTranslations("common");

  const results = query.trim() ? search(query) : [];

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown")
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      if (e.key === "ArrowUp") setSelectedIdx((i) => Math.max(i - 1, 0));
      if (e.key === "Enter" && results[selectedIdx]) {
        window.location.href = results[selectedIdx].route;
        onClose();
      }
      if (e.key === "Escape") onClose();
    },
    [results, selectedIdx, onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
          />

          {/* Dialog — wider */}
          <motion.div
            className="relative w-full max-w-2xl mx-4 border overflow-hidden shadow-xl"
            style={{ backgroundColor: C.bgWhite, borderColor: C.borderLight }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div
              className="px-5 py-2.5 flex items-center justify-between"
              style={{ backgroundColor: C.headerBg, color: C.headerText }}
            >
              <span className="text-sm font-bold uppercase tracking-wider">
                {t("search")}
              </span>
              <button
                onClick={onClose}
                className="text-sm cursor-pointer opacity-60 hover:opacity-100"
              >
                {t("esc")}
              </button>
            </div>

            {/* Input — larger */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: C.borderLight }}
            >
              <span className="text-base" style={{ color: C.textMuted }}>&gt;</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent text-base outline-none uppercase placeholder:opacity-30 placeholder:normal-case"
                style={{ color: C.text }}
              />
              <span className="text-[11px]" style={{ color: C.textMuted }}>
                {isReady
                  ? `${results.length} ${t("results")}`
                  : t("loading")}
              </span>
            </div>

            {/* Results — taller */}
            {query.trim() && (
              <div className="max-h-96 overflow-y-auto">
                {results.length === 0 ? (
                  <p
                    className="px-5 py-10 text-center text-base uppercase"
                    style={{ color: C.textMuted }}
                  >
                    {t("noResults")}
                  </p>
                ) : (
                  results.map((entry, i) => (
                    <Link
                      key={entry.id}
                      href={entry.route}
                      onClick={onClose}
                      className="block px-5 py-3 cursor-pointer border-b transition-colors"
                      style={{
                        borderColor: C.borderLight,
                        backgroundColor:
                          i === selectedIdx ? C.headerBg : "transparent",
                        color: i === selectedIdx ? C.headerText : C.text,
                      }}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="text-[10px] uppercase tracking-wider shrink-0 mt-1 font-bold"
                          style={{
                            color:
                              i === selectedIdx
                                ? C.headerText
                                : TYPE_COLORS[entry.type] || C.accent,
                          }}
                        >
                          [{TYPE_LABELS[entry.type] || "???"}]
                        </span>
                        <div className="min-w-0">
                          <p className="text-base font-medium">{entry.title}</p>
                          <p className="text-[12px] opacity-40 mt-0.5">
                            {entry.route}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Empty state */}
            {!query.trim() && (
              <div className="px-5 py-8">
                <p
                  className="text-sm uppercase"
                  style={{ color: C.textMuted }}
                >
                  {t("typeToSearch")}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
