"use client";

import { useState } from "react";
import { C } from "@/lib/theme";

/* ── Smart numeric detection for sorting ── */

function parseNumeric(s: string): number | null {
  const cleaned = s.replace(/[$€£¥%,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function compareValues(a: string, b: string): number {
  const numA = parseNumeric(a);
  const numB = parseNumeric(b);
  if (numA !== null && numB !== null) return numA - numB;
  return a.localeCompare(b);
}

/* ── DataTable ── */

interface DataTableProps {
  /** Table caption / title. */
  caption?: string;
  /** Column headers. */
  columns: string[];
  /** Row data — array of arrays. Each inner array matches `columns` order. */
  rows: string[][];
  /** Enable column sorting. Default: false. */
  sortable?: boolean;
}

export function DataTable({
  caption,
  columns,
  rows,
  sortable = false,
}: DataTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (colIndex: number) => {
    if (!sortable) return;
    if (sortCol === colIndex) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colIndex);
      setSortDir("asc");
    }
  };

  /* Sort rows */
  const displayRows = [...rows];
  if (sortable && sortCol !== null) {
    displayRows.sort((a, b) => {
      const va = a[sortCol] ?? "";
      const vb = b[sortCol] ?? "";
      const cmp = compareValues(va, vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      {/* Header */}
      {caption && (
        <div
          className="px-4 py-2.5 border-b-2"
          style={{ borderColor: C.border, backgroundColor: C.headerBg }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ■ {caption}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr
              style={{
                backgroundColor: C.bg,
                borderBottom: `2px solid ${C.border}`,
              }}
            >
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className={`px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] ${
                    sortable
                      ? "cursor-pointer select-none transition-colors"
                      : ""
                  }`}
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.text,
                    borderRight:
                      i < columns.length - 1
                        ? `1px solid ${C.borderLight}`
                        : undefined,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    {col}
                    {sortable && (
                      <span
                        className="text-[8px]"
                        style={{
                          color:
                            sortCol === i ? C.accent : C.borderLight,
                        }}
                      >
                        {sortCol === i
                          ? sortDir === "asc"
                            ? "▲"
                            : "▼"
                          : "↕"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr
                key={ri}
                className="transition-colors"
                style={{
                  borderTop:
                    ri > 0 ? `1px solid ${C.borderLight}` : undefined,
                }}
              >
                {columns.map((_, ci) => (
                  <td
                    key={ci}
                    className="px-4 py-2"
                    style={{
                      fontFamily: "var(--font-serif)",
                      color: C.text,
                      borderRight:
                        ci < columns.length - 1
                          ? `1px solid ${C.borderLight}`
                          : undefined,
                    }}
                  >
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-1.5 border-t text-[9px] uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: C.textMuted,
          borderColor: C.borderLight,
          backgroundColor: C.bg,
        }}
      >
        {displayRows.length} row{displayRows.length !== 1 ? "s" : ""}
        {sortable && " · click headers to sort"}
      </div>
    </div>
  );
}
