"use client";

import { Children, useState, useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { safeEval } from "@/lib/math/safe-eval";
import { C } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

/* ═══════════════════════════════════════════════════
   Data-carrier components
   ═══════════════════════════════════════════════════ */

interface BarProps {
  label: string;
  /** Static numeric value. */
  value?: number;
  /** Reactive expression string (evaluated with slider vars). */
  expr?: string;
  color?: string;
}

export function Bar(_: BarProps) {
  return null;
}

// Re-import Slider type for extraction
interface SliderDef {
  name: string;
  min?: number;
  max?: number;
  default?: number;
  step?: number;
  label?: string;
}

/* ═══════════════════════════════════════════════════
   BarChart component
   ═══════════════════════════════════════════════════ */

interface BarChartProps {
  title?: string;
  orientation?: "horizontal" | "vertical";
  animate?: boolean;
  showValues?: boolean;
  children: ReactNode;
}

export function BarChart({
  title,
  orientation = "horizontal",
  animate = true,
  showValues = true,
  children,
}: BarChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const shouldAnimate = animate && inView;

  /* ── Extract children ── */
  const bars: BarProps[] = [];
  const sliderDefs: SliderDef[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;
    if (typeof p.label === "string" && (p.value !== undefined || p.expr)) {
      bars.push(p as BarProps);
    } else if (typeof p.name === "string" && p.min !== undefined) {
      sliderDefs.push(p as SliderDef);
    }
  });

  /* ── Slider state ── */
  const [vars, setVars] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    for (const s of sliderDefs) v[s.name] = s.default ?? 0;
    return v;
  });

  /* ── Compute bar values ── */
  const values = bars.map((b) => {
    if (b.expr) {
      const v = safeEval(b.expr, vars);
      return isFinite(v) ? Math.max(0, v) : 0;
    }
    return Math.max(0, b.value ?? 0);
  });

  const maxVal = Math.max(...values, 1);

  const PALETTE = [
    "#2563EB",
    "#0066cc",
    "#22863a",
    "#cc6600",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#f59e0b",
  ];

  const isH = orientation === "horizontal";

  return (
    <div ref={ref} className="mb-6 border-2" style={{ borderColor: C.border }}>
      {/* Header */}
      {title && (
        <div
          className="flex items-center px-4 py-2.5 border-b-2"
          style={{ backgroundColor: C.headerBg, borderColor: C.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ▥ {title}
          </span>
        </div>
      )}

      {/* Bars */}
      <div
        className={`px-4 py-4 ${isH ? "space-y-3" : "flex items-end gap-3 justify-center"}`}
        style={{
          backgroundColor: C.bg,
          minHeight: isH ? undefined : 180,
        }}
      >
        {bars.map((b, i) => {
          const pct = maxVal > 0 ? (values[i] / maxVal) * 100 : 0;
          const c = b.color || PALETTE[i % PALETTE.length];

          if (isH) {
            /* ── Horizontal bars ── */
            return (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] min-w-20 text-right"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.text,
                  }}
                >
                  {b.label}
                </span>
                <div className="flex-1 h-6 relative" style={{ backgroundColor: C.borderLight }}>
                  <motion.div
                    className="h-full absolute left-0 top-0"
                    style={{ backgroundColor: c }}
                    initial={shouldAnimate ? { width: 0 } : false}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      delay: shouldAnimate ? i * 0.1 : 0,
                      duration: 0.6,
                      type: "spring",
                      stiffness: 80,
                      damping: 15,
                    }}
                  />
                  {showValues && (
                    <span
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: pct > 60 ? "#fff" : C.text,
                        zIndex: 1,
                      }}
                    >
                      {values[i] >= 100
                        ? values[i].toFixed(0)
                        : values[i].toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          /* ── Vertical bars ── */
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1"
              style={{ flex: "1 1 0" }}
            >
              {showValues && (
                <span
                  className="text-[9px] font-bold"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: c,
                  }}
                >
                  {values[i] >= 100
                    ? values[i].toFixed(0)
                    : values[i].toFixed(1)}
                </span>
              )}
              <div
                className="w-full relative"
                style={{
                  height: 120,
                  backgroundColor: C.borderLight,
                }}
              >
                <motion.div
                  className="w-full absolute bottom-0 left-0"
                  style={{ backgroundColor: c }}
                  initial={shouldAnimate ? { height: 0 } : false}
                  animate={{ height: `${pct}%` }}
                  transition={{
                    delay: shouldAnimate ? i * 0.1 : 0,
                    duration: 0.6,
                    type: "spring",
                    stiffness: 80,
                    damping: 15,
                  }}
                />
              </div>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.05em] text-center"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: C.text,
                }}
              >
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sliders (if interactive) */}
      {sliderDefs.length > 0 && (
        <div
          className="px-4 py-3 border-t-2 space-y-3"
          style={{ backgroundColor: C.bgWhite, borderColor: C.borderLight }}
        >
          {sliderDefs.map((s) => {
            const val = vars[s.name] ?? s.default ?? 0;
            const step = s.step ?? 0.1;
            const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;

            return (
              <div key={s.name} className="flex items-center gap-3">
                <label
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] min-w-24"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.text,
                  }}
                >
                  {s.label || s.name}
                </label>
                <input
                  type="range"
                  min={s.min ?? 0}
                  max={s.max ?? 100}
                  step={step}
                  value={val}
                  onChange={(e) =>
                    setVars((p) => ({
                      ...p,
                      [s.name]: parseFloat(e.target.value),
                    }))
                  }
                  className="flex-1 h-1.5 cursor-pointer accent-blue-600"
                />
                <span
                  className="shrink-0 text-[11px] font-bold tabular-nums w-14 text-right"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.accent,
                  }}
                >
                  {val.toFixed(decimals)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
