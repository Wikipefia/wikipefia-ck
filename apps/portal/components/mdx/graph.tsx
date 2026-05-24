"use client";

import { useState, Children, type ReactNode } from "react";
import { safeEval } from "@/lib/math/safe-eval";
import { C } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

/* ── Default color palette for plot lines ── */
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

/* ═══════════════════════════════════════════════════
   Data-carrier components (rendered by Graph parent)
   ═══════════════════════════════════════════════════ */

interface PlotProps {
  /** Math expression string. Variable `x` is the horizontal axis.
   *  Slider variables are available by name (e.g. `"a - b * x"`). */
  expr: string;
  /** Line color. Auto-assigned from palette if omitted. */
  color?: string;
  /** Legend label. */
  label?: string;
  /** Dashed line style. */
  dashed?: boolean;
  /** Line thickness (default 2.5). */
  strokeWidth?: number;
}

/** Defines a function to plot on the graph. Used inside `<Graph>`. */
export function Plot(_: PlotProps) {
  return null;
}

interface SliderProps {
  /** Variable name — accessible in Plot/Value fn as `vars.name`. */
  name: string;
  min?: number;
  max?: number;
  default?: number;
  step?: number;
  /** Display label. Falls back to `name` if omitted. */
  label?: string;
}

/** Defines a parameter slider. Used inside `<Graph>` or `<Interactive>`. */
export function Slider(_: SliderProps) {
  return null;
}

/* ── Annotation data-carrier components ── */

interface PointProps {
  /** X coordinate (expr string). */
  x: string;
  /** Y coordinate (expr string). */
  y: string;
  /** Text label near the point. */
  label?: string;
  /** Dot color. */
  color?: string;
  /** Dot radius (default 4). */
  r?: number;
  /** Draw dashed line from point down to X axis. */
  showXLine?: boolean;
  /** Draw dashed line from point left to Y axis. */
  showYLine?: boolean;
}

/** Marks a labeled point on the graph. Used inside `<Graph>`. */
export function Point(_: PointProps) {
  return null;
}

interface HLineProps {
  /** Y coordinate (expr string). */
  y: string;
  color?: string;
  dashed?: boolean;
  label?: string;
}

/** Horizontal reference line. Used inside `<Graph>`. */
export function HLine(_: HLineProps) {
  return null;
}

interface VLineProps {
  /** X coordinate (expr string). */
  x: string;
  color?: string;
  dashed?: boolean;
  label?: string;
}

/** Vertical reference line. Used inside `<Graph>`. */
export function VLine(_: VLineProps) {
  return null;
}

interface AreaProps {
  /** Upper bound curve (expr string with `x`). */
  above: string;
  /** Lower bound curve (expr string with `x`). Defaults to "0" (x-axis). */
  below?: string;
  /** X range start (expr string). */
  from: string;
  /** X range end (expr string). */
  to: string;
  color?: string;
  /** Fill opacity (default 0.15). */
  opacity?: number;
  label?: string;
}

/** Shaded area between two curves. Used inside `<Graph>`. */
export function Area(_: AreaProps) {
  return null;
}

interface SegmentProps {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
}

/** Line segment between two points. Used inside `<Graph>`. */
export function Segment(_: SegmentProps) {
  return null;
}

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

/** Pick "nice" grid intervals (1, 2, 5 × 10^n). */
function niceStep(range: number, targetLines: number): number {
  if (range <= 0) return 1;
  const rough = range / targetLines;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const r = rough / mag;
  if (r <= 1.5) return mag;
  if (r <= 3) return 2 * mag;
  if (r <= 7) return 5 * mag;
  return 10 * mag;
}

/** Format a number for axis labels. */
function fmtNum(n: number): string {
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 10000) return n.toExponential(1);
  if (a >= 100) return n.toFixed(0);
  if (Number.isInteger(n)) return String(n);
  if (a >= 1) return n.toFixed(1);
  return n.toPrecision(2);
}

/** Generate grid line positions, avoiding floating-point drift. */
function gridLines(min: number, max: number, step: number): number[] {
  const lines: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let i = 0; ; i++) {
    const v = start + i * step;
    if (v > max + step * 0.001) break;
    // Round to step precision to avoid 0.30000000000000004
    lines.push(parseFloat(v.toPrecision(10)));
  }
  return lines;
}

/* ═══════════════════════════════════════════════════
   Graph component
   ═══════════════════════════════════════════════════ */

interface GraphProps {
  /** Graph title (shown in header bar). */
  title?: string;
  /** X axis label. */
  xLabel?: string;
  /** Y axis label. */
  yLabel?: string;
  /** X domain as [min, max]. Default: [-10, 10]. */
  xDomain?: [number, number];
  /** Y domain as [min, max]. Auto-computed from functions if omitted. */
  yDomain?: [number, number];
  /** SVG viewBox width (default 600). */
  width?: number;
  /** SVG viewBox height (default 380). */
  height?: number;
  children: ReactNode;
}

export function Graph({
  title,
  xLabel,
  yLabel,
  xDomain: xDomainProp,
  yDomain: yDomainProp,
  width = 600,
  height = 380,
  children,
}: GraphProps) {
  /* ── Unique clip-path ID ── */
  const [clipId] = useState(
    () => `gc${Math.random().toString(36).slice(2, 8)}`
  );

  /* ── Extract child definitions ── */
  const plots: PlotProps[] = [];
  const sliderDefs: SliderProps[] = [];
  const pointDefs: PointProps[] = [];
  const hLineDefs: HLineProps[] = [];
  const vLineDefs: VLineProps[] = [];
  const areaDefs: AreaProps[] = [];
  const segmentDefs: SegmentProps[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;

    if (typeof p.above === "string") {
      // Area: has `above`
      areaDefs.push(p as AreaProps);
    } else if (typeof p.x1 === "string" && typeof p.y1 === "string") {
      // Segment: has x1+y1
      segmentDefs.push(p as SegmentProps);
    } else if (
      typeof p.x === "string" &&
      typeof p.y === "string" &&
      typeof p.expr !== "string"
    ) {
      // Point: has x+y, no expr
      pointDefs.push(p as PointProps);
    } else if (
      typeof p.y === "string" &&
      typeof p.x !== "string" &&
      typeof p.expr !== "string" &&
      typeof p.name !== "string"
    ) {
      // HLine: has y, no x, no expr, no name
      hLineDefs.push(p as HLineProps);
    } else if (
      typeof p.x === "string" &&
      typeof p.y !== "string" &&
      typeof p.expr !== "string" &&
      typeof p.name !== "string"
    ) {
      // VLine: has x, no y, no expr, no name
      vLineDefs.push(p as VLineProps);
    } else if (typeof p.expr === "string" && !p.name) {
      plots.push(p as PlotProps);
    } else if (typeof p.name === "string" && p.min !== undefined) {
      sliderDefs.push(p as SliderProps);
    }
  });

  /* ── Slider state ── */
  const [vars, setVars] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    for (const s of sliderDefs) v[s.name] = s.default ?? 0;
    return v;
  });

  /* ── Domains ── */
  const [xMin, xMax] = xDomainProp ?? [-10, 10];

  let yMin: number;
  let yMax: number;

  if (yDomainProp) {
    [yMin, yMax] = yDomainProp;
  } else {
    // Auto-compute Y domain from function outputs
    let lo = Infinity;
    let hi = -Infinity;
    const dx = (xMax - xMin) / 200;
    for (const plot of plots) {
      for (let i = 0; i <= 200; i++) {
        const x = xMin + i * dx;
        const y = safeEval(plot.expr, { ...vars, x });
        if (isFinite(y) && Math.abs(y) < 1e8) {
          lo = Math.min(lo, y);
          hi = Math.max(hi, y);
        }
      }
    }
    if (!isFinite(lo)) {
      lo = -10;
      hi = 10;
    }
    const range = hi - lo || 2;
    yMin = lo - range * 0.15;
    yMax = hi + range * 0.15;
  }

  /* ── Layout calculations ── */
  const pad = {
    top: title ? 12 : 20,
    right: 25,
    bottom: xLabel ? 55 : 40,
    left: 55,
  };
  const pW = width - pad.left - pad.right;
  const pH = height - pad.top - pad.bottom;

  /** Map math X → SVG X. */
  const toX = (x: number) => pad.left + ((x - xMin) / (xMax - xMin)) * pW;
  /** Map math Y → SVG Y (inverted). */
  const toY = (y: number) =>
    pad.top + pH - ((y - yMin) / (yMax - yMin)) * pH;

  /* ── Grid lines ── */
  const xStep = niceStep(xMax - xMin, 8);
  const yStep = niceStep(yMax - yMin, 6);
  const xLines = gridLines(xMin, xMax, xStep);
  const yLines = gridLines(yMin, yMax, yStep);

  /* ── Generate SVG paths ── */
  const SAMPLES = 500;
  const pathStrings = plots.map((plot) => {
    const dx = (xMax - xMin) / SAMPLES;
    const parts: string[] = [];
    let inPath = false;
    let prevPy = 0;

    for (let i = 0; i <= SAMPLES; i++) {
      const x = xMin + i * dx;
      const y = safeEval(plot.expr, { ...vars, x });

      if (!isFinite(y)) {
        inPath = false;
        continue;
      }

      const px = toX(x);
      const py = toY(y);

      // Detect discontinuity (vertical jump > 70% of plot height)
      if (inPath && Math.abs(py - prevPy) > pH * 0.7) {
        inPath = false;
      }

      if (!inPath) {
        parts.push(`M${px.toFixed(1)},${py.toFixed(1)}`);
        inPath = true;
      } else {
        parts.push(`L${px.toFixed(1)},${py.toFixed(1)}`);
      }
      prevPy = py;
    }

    return parts.join(" ");
  });

  /* ── Zero-axis positions ── */
  const zeroX = xMin <= 0 && xMax >= 0 ? toX(0) : null;
  const zeroY = yMin <= 0 && yMax >= 0 ? toY(0) : null;

  /* ── Render ── */
  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      {/* ── Header bar ── */}
      {title && (
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b-2"
          style={{ backgroundColor: C.headerBg, borderColor: C.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ■ {title}
          </span>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {plots.map((p, i) =>
              p.label ? (
                <div key={i} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3.5"
                    style={{
                      height: p.dashed ? 1 : 2,
                      backgroundColor:
                        p.color || PALETTE[i % PALETTE.length],
                      borderTop: p.dashed
                        ? `2px dashed ${p.color || PALETTE[i % PALETTE.length]}`
                        : undefined,
                    }}
                  />
                  <span
                    className="text-[9px] uppercase tracking-[0.1em]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: C.textMuted,
                    }}
                  >
                    {p.label}
                  </span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* ── SVG graph ── */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        style={{ backgroundColor: C.bg }}
        aria-label={title || "Mathematical graph"}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={pad.left} y={pad.top} width={pW} height={pH} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {xLines.map((v) => (
          <line
            key={`gx${v}`}
            x1={toX(v)}
            y1={pad.top}
            x2={toX(v)}
            y2={pad.top + pH}
            stroke="currentColor"
            strokeWidth={0.5}
            opacity={0.07}
          />
        ))}
        {yLines.map((v) => (
          <line
            key={`gy${v}`}
            x1={pad.left}
            y1={toY(v)}
            x2={pad.left + pW}
            y2={toY(v)}
            stroke="currentColor"
            strokeWidth={0.5}
            opacity={0.07}
          />
        ))}

        {/* Zero axes (heavier lines at x=0, y=0) */}
        {zeroX !== null && (
          <line
            x1={zeroX}
            y1={pad.top}
            x2={zeroX}
            y2={pad.top + pH}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.15}
          />
        )}
        {zeroY !== null && (
          <line
            x1={pad.left}
            y1={zeroY}
            x2={pad.left + pW}
            y2={zeroY}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.15}
          />
        )}

        {/* Plot curves (clipped to plot area) */}
        <g clipPath={`url(#${clipId})`}>
          {/* Shaded areas (render below curves) */}
          {areaDefs.map((a, i) => {
            const xFrom = safeEval(a.from, vars);
            const xTo = safeEval(a.to, vars);
            if (!isFinite(xFrom) || !isFinite(xTo) || xFrom >= xTo)
              return null;
            const belowExpr = a.below ?? "0";
            const steps = 120;
            const dx = (xTo - xFrom) / steps;
            const pts: string[] = [];
            // Top edge (above curve, left to right)
            for (let j = 0; j <= steps; j++) {
              const xv = xFrom + j * dx;
              const yv = safeEval(a.above, { ...vars, x: xv });
              if (isFinite(yv))
                pts.push(`${toX(xv).toFixed(1)},${toY(yv).toFixed(1)}`);
            }
            // Bottom edge (below curve, right to left)
            for (let j = steps; j >= 0; j--) {
              const xv = xFrom + j * dx;
              const yv = safeEval(belowExpr, { ...vars, x: xv });
              if (isFinite(yv))
                pts.push(`${toX(xv).toFixed(1)},${toY(yv).toFixed(1)}`);
            }
            return (
              <polygon
                key={`area${i}`}
                points={pts.join(" ")}
                fill={a.color || "#0066cc"}
                fillOpacity={a.opacity ?? 0.15}
                stroke="none"
              />
            );
          })}

          {pathStrings.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={plots[i]?.color || PALETTE[i % PALETTE.length]}
              strokeWidth={plots[i]?.strokeWidth || 2.5}
              strokeDasharray={plots[i]?.dashed ? "8 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Segments */}
          {segmentDefs.map((s, i) => {
            const sx1 = safeEval(s.x1, vars);
            const sy1 = safeEval(s.y1, vars);
            const sx2 = safeEval(s.x2, vars);
            const sy2 = safeEval(s.y2, vars);
            if ([sx1, sy1, sx2, sy2].some((v) => !isFinite(v))) return null;
            return (
              <line
                key={`seg${i}`}
                x1={toX(sx1)}
                y1={toY(sy1)}
                x2={toX(sx2)}
                y2={toY(sy2)}
                stroke={s.color || "#cc6600"}
                strokeWidth={s.strokeWidth ?? 1.5}
                strokeDasharray={s.dashed ? "6 3" : undefined}
              />
            );
          })}

          {/* HLines */}
          {hLineDefs.map((h, i) => {
            const yv = safeEval(h.y, vars);
            if (!isFinite(yv)) return null;
            const py = toY(yv);
            return (
              <g key={`hl${i}`}>
                <line
                  x1={pad.left}
                  y1={py}
                  x2={pad.left + pW}
                  y2={py}
                  stroke={h.color || C.textMuted}
                  strokeWidth={1}
                  strokeDasharray={h.dashed !== false ? "6 3" : undefined}
                />
                {h.label && (
                  <text
                    x={pad.left + pW + 4}
                    y={py + 3}
                    fontSize={8}
                    fontFamily="var(--font-mono)"
                    fontWeight="bold"
                    fill={h.color || C.textMuted}
                  >
                    {h.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* VLines */}
          {vLineDefs.map((v, i) => {
            const xv = safeEval(v.x, vars);
            if (!isFinite(xv)) return null;
            const px = toX(xv);
            return (
              <g key={`vl${i}`}>
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={pad.top + pH}
                  stroke={v.color || C.textMuted}
                  strokeWidth={1}
                  strokeDasharray={v.dashed !== false ? "6 3" : undefined}
                />
                {v.label && (
                  <text
                    x={px}
                    y={pad.top + pH + 16}
                    textAnchor="middle"
                    fontSize={8}
                    fontFamily="var(--font-mono)"
                    fontWeight="bold"
                    fill={v.color || C.textMuted}
                  >
                    {v.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Points (with projection lines) */}
          {pointDefs.map((pt, i) => {
            const xv = safeEval(pt.x, vars);
            const yv = safeEval(pt.y, vars);
            if (!isFinite(xv) || !isFinite(yv)) return null;
            const px = toX(xv);
            const py = toY(yv);
            const c = pt.color || C.text;
            return (
              <g key={`pt${i}`}>
                {pt.showYLine && (
                  <line
                    x1={pad.left}
                    y1={py}
                    x2={px}
                    y2={py}
                    stroke={c}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.5}
                  />
                )}
                {pt.showXLine && (
                  <line
                    x1={px}
                    y1={py}
                    x2={px}
                    y2={pad.top + pH}
                    stroke={c}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.5}
                  />
                )}
                <circle cx={px} cy={py} r={pt.r ?? 4} fill={c} />
                {pt.label && (
                  <text
                    x={px + 7}
                    y={py - 7}
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                    fontWeight="bold"
                    fill={c}
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Plot area border */}
        <rect
          x={pad.left}
          y={pad.top}
          width={pW}
          height={pH}
          fill="none"
          stroke={C.text}
          strokeWidth={2}
        />

        {/* X axis labels */}
        {xLines.map((v) => (
          <text
            key={`lx${v}`}
            x={toX(v)}
            y={pad.top + pH + 18}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-mono)"
            fill={C.textMuted}
          >
            {fmtNum(v)}
          </text>
        ))}

        {/* Y axis labels */}
        {yLines.map((v) => (
          <text
            key={`ly${v}`}
            x={pad.left - 8}
            y={toY(v) + 3}
            textAnchor="end"
            fontSize={9}
            fontFamily="var(--font-mono)"
            fill={C.textMuted}
          >
            {fmtNum(v)}
          </text>
        ))}

        {/* X axis title */}
        {xLabel && (
          <text
            x={pad.left + pW / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-mono)"
            fill={C.textMuted}
            fontWeight="bold"
          >
            {xLabel.toUpperCase()}
          </text>
        )}

        {/* Y axis title */}
        {yLabel && (
          <text
            x={14}
            y={pad.top + pH / 2}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-mono)"
            fill={C.textMuted}
            fontWeight="bold"
            transform={`rotate(-90 14 ${pad.top + pH / 2})`}
          >
            {yLabel.toUpperCase()}
          </text>
        )}
      </svg>

      {/* ── Sliders ── */}
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
                  min={s.min ?? -10}
                  max={s.max ?? 10}
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
