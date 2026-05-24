"use client";

import { Children, type ReactNode, useRef } from "react";
import { motion, useInView } from "motion/react";
import { C } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

/* ═══════════════════════════════════════════════════
   Data-carrier components
   ═══════════════════════════════════════════════════ */

interface DBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  color?: string;
  rounded?: boolean;
}

export function DBox(_: DBoxProps) {
  return null;
}

interface DCircleProps {
  x: number;
  y: number;
  r: number;
  label?: string;
  color?: string;
  pulse?: boolean;
}

export function DCircle(_: DCircleProps) {
  return null;
}

interface DArrowProps {
  from: [number, number];
  to: [number, number];
  label?: string;
  color?: string;
  animated?: boolean;
  curved?: boolean;
}

export function DArrow(_: DArrowProps) {
  return null;
}

interface DLabelProps {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
}

export function DLabel(_: DLabelProps) {
  return null;
}

/* ═══════════════════════════════════════════════════
   Diagram component (low-level SVG canvas)
   ═══════════════════════════════════════════════════ */

interface DiagramProps {
  title?: string;
  width?: number;
  height?: number;
  animate?: boolean;
  children: ReactNode;
}

export function Diagram({
  title,
  width = 500,
  height = 300,
  animate = true,
  children,
}: DiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const shouldAnimate = animate && inView;

  /* ── Extract all child shapes ── */
  const boxes: DBoxProps[] = [];
  const circles: DCircleProps[] = [];
  const arrows: DArrowProps[] = [];
  const labels: DLabelProps[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;

    if (p.w !== undefined && p.h !== undefined) {
      boxes.push(p as DBoxProps);
    } else if (p.r !== undefined && typeof p.x === "number") {
      circles.push(p as DCircleProps);
    } else if (Array.isArray(p.from) && Array.isArray(p.to)) {
      arrows.push(p as DArrowProps);
    } else if (typeof p.text === "string") {
      labels.push(p as DLabelProps);
    }
  });

  let idx = 0;

  return (
    <div ref={ref} className="mb-6 border-2" style={{ borderColor: C.border }}>
      {title && (
        <div
          className="flex items-center px-4 py-2.5 border-b-2"
          style={{ borderColor: C.border, backgroundColor: C.headerBg }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ◇ {title}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block"
        style={{ backgroundColor: C.bg }}
      >
        <defs>
          <marker
            id="d-arrow"
            viewBox="0 0 10 8"
            refX="10"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 4L0 8z" style={{ fill: C.text }} />
          </marker>
        </defs>

        {/* Arrows (render behind shapes) */}
        {arrows.map((a, i) => {
          const [x1, y1] = a.from;
          const [x2, y2] = a.to;
          const c = a.color || C.text;
          const order = idx++;

          if (a.curved) {
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 - 30;
            const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
            return (
              <g key={`da${i}`}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={c}
                  strokeWidth={2}
                  markerEnd="url(#d-arrow)"
                  strokeDasharray={a.animated ? "6 4" : undefined}
                  initial={
                    shouldAnimate ? { pathLength: 0, opacity: 0 } : false
                  }
                  animate={
                    shouldAnimate ? { pathLength: 1, opacity: 1 } : undefined
                  }
                  transition={{ delay: order * 0.1, duration: 0.5 }}
                />
                {a.label && (
                  <text
                    x={mx}
                    y={my - 6}
                    textAnchor="middle"
                    fontSize={8}
                    fontFamily="var(--font-mono)"
                    style={{ fill: C.textMuted }}
                    fontWeight="bold"
                  >
                    {a.label}
                  </text>
                )}
              </g>
            );
          }

          return (
            <g key={`da${i}`}>
              <motion.line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={c}
                strokeWidth={2}
                markerEnd="url(#d-arrow)"
                strokeDasharray={a.animated ? "6 4" : undefined}
                initial={
                  shouldAnimate ? { pathLength: 0, opacity: 0 } : false
                }
                animate={
                  shouldAnimate ? { pathLength: 1, opacity: 1 } : undefined
                }
                transition={{ delay: order * 0.1, duration: 0.5 }}
              />
              {a.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 8}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-mono)"
                  style={{ fill: C.textMuted }}
                  fontWeight="bold"
                >
                  {a.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Boxes */}
        {boxes.map((b, i) => {
          const c = b.color || C.text;
          const order = idx++;
          return (
            <motion.g
              key={`db${i}`}
              initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              transition={{ delay: order * 0.1, duration: 0.4 }}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                style={{ fill: C.bgWhite }}
                stroke={c}
                strokeWidth={2}
                rx={b.rounded ? 6 : 0}
              />
              {b.label && (
                <text
                  x={b.x + b.w / 2}
                  y={b.y + b.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                  fill={c}
                >
                  {b.label}
                </text>
              )}
            </motion.g>
          );
        })}

        {/* Circles */}
        {circles.map((c, i) => {
          const color = c.color || C.text;
          const order = idx++;
          return (
            <motion.g
              key={`dc${i}`}
              initial={shouldAnimate ? { opacity: 0, scale: 0.5 } : false}
              animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
              transition={{
                delay: order * 0.1,
                duration: 0.4,
                type: "spring",
              }}
              style={{ transformOrigin: `${c.x}px ${c.y}px` }}
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={c.r}
                style={{ fill: C.bgWhite }}
                stroke={color}
                strokeWidth={2}
              />
              {c.pulse && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.r}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.3}
                >
                  <animate
                    attributeName="r"
                    from={String(c.r)}
                    to={String(c.r + 12)}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.3"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {c.label && (
                <text
                  x={c.x}
                  y={c.y + 4}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                  fill={color}
                >
                  {c.label}
                </text>
              )}
            </motion.g>
          );
        })}

        {/* Labels */}
        {labels.map((l, i) => {
          const order = idx++;
          return (
            <motion.text
              key={`dl${i}`}
              x={l.x}
              y={l.y}
              fontSize={l.fontSize ?? 10}
              fontFamily="var(--font-mono)"
              fontWeight={l.bold ? "bold" : "normal"}
              fill={l.color || C.text}
              initial={shouldAnimate ? { opacity: 0 } : false}
              animate={shouldAnimate ? { opacity: 1 } : undefined}
              transition={{ delay: order * 0.1, duration: 0.3 }}
            >
              {l.text}
            </motion.text>
          );
        })}
      </svg>
    </div>
  );
}
