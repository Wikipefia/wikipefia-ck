import { Children, type ReactNode } from "react";
import { C } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

/* ── Default accent colors ── */
const ACCENTS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2"];

/* ── Data carrier ── */

interface ComparisonItemProps {
  /** Column title. */
  title: string;
  /** Optional accent color for the title marker. */
  color?: string;
  children: ReactNode;
}

/** Defines one side of a comparison. Used inside `<Comparison>`. */
export function ComparisonItem({ children }: ComparisonItemProps) {
  return <>{children}</>;
}

/* ── Comparison ── */

interface ComparisonProps {
  /** Optional title in header bar. */
  title?: string;
  children: ReactNode;
}

export function Comparison({ title, children }: ComparisonProps) {
  const items: (ComparisonItemProps & { content: ReactNode })[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;
    if (typeof p.title === "string") {
      items.push({
        title: p.title,
        color: p.color,
        children: p.children,
        content: p.children,
      });
    }
  });

  if (items.length === 0) return null;

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      {/* Header */}
      {title && (
        <div
          className="px-4 py-2.5 border-b-2"
          style={{ borderColor: C.border, backgroundColor: C.headerBg }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ■ {title}
          </span>
        </div>
      )}

      {/* Columns */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          backgroundColor: C.bgWhite,
        }}
      >
        {items.map((item, i) => {
          const accent = item.color || ACCENTS[i % ACCENTS.length];
          const isLast = i === items.length - 1;

          return (
            <div
              key={i}
              className="px-4 py-4"
              style={{
                borderRight: !isLast ? `1px solid ${C.borderLight}` : undefined,
              }}
            >
              {/* Column title */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-block w-2.5 h-2.5 shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.1em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.text,
                  }}
                >
                  {item.title}
                </span>
              </div>

              {/* Content */}
              <div
                className="text-[13px] leading-[1.75]"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: C.textMuted,
                }}
              >
                {item.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
