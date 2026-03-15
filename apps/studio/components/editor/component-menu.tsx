"use client";

import { useState } from "react";
import { C } from "@/lib/theme";
import {
  COMPONENT_CATALOG,
  CATEGORY_META,
  type Category,
  type CatalogEntry,
} from "@/lib/component-catalog";

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

const byCategory: Record<Category, CatalogEntry[]> = {
  content: [],
  data: [],
  interactive: [],
  diagrams: [],
};
for (const entry of COMPONENT_CATALOG) {
  byCategory[entry.category].push(entry);
}

interface ComponentMenuProps {
  onInsert: (snippet: string) => void;
}

export function ComponentMenu({ onInsert }: ComponentMenuProps) {
  const [active, setActive] = useState<Category>("content");

  return (
    <div
      className="flex flex-col h-full border-r"
      style={{ borderColor: C.borderLight }}
    >
      {/* Category tabs */}
      <div
        className="flex shrink-0 border-b overflow-x-auto"
        style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
      >
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isActive = active === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              className="relative px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-colors cursor-pointer"
              style={{
                fontFamily: "var(--font-mono)",
                color: isActive ? C.text : C.textMuted,
                backgroundColor: isActive ? C.bgWhite : "transparent",
              }}
            >
              <span className="mr-1.5">{meta.icon}</span>
              {meta.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: C.accent }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Component grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <div className="grid grid-cols-1 gap-1.5">
          {byCategory[active].map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => onInsert(entry.snippet)}
              className="flex items-start gap-2 px-2.5 py-2 text-left border transition-colors cursor-pointer group"
              style={{
                borderColor: C.borderLight,
                backgroundColor: C.bgWhite,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.borderLight;
              }}
              title={entry.snippet}
            >
              <span
                className="text-[14px] leading-none mt-0.5 shrink-0 w-5 text-center"
                style={{ color: C.accent }}
              >
                {entry.icon}
              </span>
              <div className="min-w-0">
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.08em] truncate"
                  style={{ fontFamily: "var(--font-mono)", color: C.text }}
                >
                  {entry.label}
                </div>
                <div
                  className="text-[9px] leading-tight mt-0.5 opacity-70 line-clamp-2"
                  style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
                >
                  {entry.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
