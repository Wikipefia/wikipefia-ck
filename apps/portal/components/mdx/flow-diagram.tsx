"use client";

import { Children, type ReactNode, useRef, useState, useEffect } from "react";
import { motion, useInView } from "motion/react";
import { C } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

/* ── Inline icon set (simple SVG paths, 16×16 viewBox) ── */
const ICONS: Record<string, string> = {
  cart: "M1 1h2l1.5 7H12l1.5-5H4.5M6 13a1 1 0 1 0 2 0 1 1 0 0 0-2 0m5 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0",
  "trending-up":
    "M2 12l4-4 3 3 6-6M11 5h4v4",
  landmark:
    "M8 1L1 5v1h14V5L8 1zM2 7v6h2V7H2zm4 0v6h2V7H6zm4 0v6h2V7h-2zm4 0v6h2V7h-2zM1 14h14v1H1v-1z",
  globe:
    "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM1.5 8h13M8 1c-2 2-2.5 4-2.5 7s.5 5 2.5 7c2-2 2.5-4 2.5-7S10 3 8 1z",
  users:
    "M5.5 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1 14s0-4 4.5-4S10 14 10 14H1zm9-7a2.5 2.5 0 1 0 0-5M11 10c2.5 0 4 2 4 4h-3",
  building:
    "M3 1h10v14H3V1zm2 2h2v2H5V3zm4 0h2v2H9V3zM5 7h2v2H5V7zm4 0h2v2H9V7zM6 12h4v3H6v-3z",
  coin: "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM8 4v1m0 6v1M6 8h4",
  gear: "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.8 1l-.4 2-.6.3-1.8-1L2 4.3l1 1.8-.3.6-2 .4v3l2 .4.3.6-1 1.8 2 2 1.8-1 .6.3.4 2h3l.4-2 .6-.3 1.8 1 2-2-1-1.8.3-.6 2-.4v-3l-2-.4-.3-.6 1-1.8-2-2-1.8 1-.6-.3L9.2 1h-3z",
  book: "M2 2h5s1 0 1 1v11s-1-1-2-1H2V2zm12 0H9s-1 0-1 1v11s1-1 2-1h4V2z",
  lightning:
    "M8.5 1L3 9h4.5L6 15l7-8H8.5L11 1z",
};

/* ═══════════════════════════════════════════════════
   Data-carrier components
   ═══════════════════════════════════════════════════ */

interface FlowNodeProps {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  highlight?: boolean;
}

export function FlowNode(_: FlowNodeProps) {
  return null;
}

interface FlowArrowProps {
  from: string;
  to: string;
  label?: string;
  color?: string;
  animated?: boolean;
}

export function FlowArrow(_: FlowArrowProps) {
  return null;
}

/* ═══════════════════════════════════════════════════
   FlowDiagram component
   ═══════════════════════════════════════════════════ */

interface FlowDiagramProps {
  title?: string;
  direction?: "horizontal" | "vertical";
  animate?: boolean;
  children: ReactNode;
}

export function FlowDiagram({
  title,
  direction = "vertical",
  animate = true,
  children,
}: FlowDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const shouldAnimate = animate && inView;

  /* ── Extract children ── */
  const nodes: FlowNodeProps[] = [];
  const arrows: FlowArrowProps[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;
    if (typeof p.id === "string" && typeof p.label === "string") {
      nodes.push(p as FlowNodeProps);
    } else if (typeof p.from === "string" && typeof p.to === "string") {
      arrows.push(p as FlowArrowProps);
    }
  });

  /* ── Auto-generate arrows if none provided ── */
  const effectiveArrows: FlowArrowProps[] =
    arrows.length > 0
      ? arrows
      : nodes.slice(0, -1).map((n, i) => ({
          from: n.id,
          to: nodes[i + 1].id,
        }));

  /* ── Layout: compute node positions ── */
  const isH = direction === "horizontal";
  const nodeW = 160;
  const nodeH = 52;
  const gap = isH ? 80 : 50;

  // Build adjacency map for layout
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  // Simple layout: place nodes sequentially
  const positions = nodes.map((_, i) => ({
    x: isH ? i * (nodeW + gap) : 0,
    y: isH ? 0 : i * (nodeH + gap),
  }));

  const svgW = isH
    ? nodes.length * nodeW + (nodes.length - 1) * gap
    : nodeW;
  const svgH = isH
    ? nodeH
    : nodes.length * nodeH + (nodes.length - 1) * gap;

  // Expand for arrow labels
  const padX = 40;
  const padY = 30;
  const totalW = svgW + padX * 2;
  const totalH = svgH + padY * 2;

  return (
    <div ref={ref} className="mb-6 border-2" style={{ borderColor: C.border }}>
      {title && (
        <div
          className="flex items-center px-4 py-2.5 border-b-2"
          style={{ backgroundColor: C.headerBg, borderColor: C.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ◆ {title}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full h-auto block"
        style={{ backgroundColor: C.bg }}
      >
        <defs>
          <marker
            id="flow-arrow"
            viewBox="0 0 10 8"
            refX="10"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 4L0 8z" fill={C.text} />
          </marker>
        </defs>

        {/* Arrows */}
        {effectiveArrows.map((a, i) => {
          const fi = nodeIndex.get(a.from);
          const ti = nodeIndex.get(a.to);
          if (fi === undefined || ti === undefined) return null;

          const fp = positions[fi];
          const tp = positions[ti];

          const x1 = padX + fp.x + nodeW / 2;
          const y1 = padY + fp.y + nodeH / 2;
          const x2 = padX + tp.x + nodeW / 2;
          const y2 = padY + tp.y + nodeH / 2;

          // Adjust start/end to node edge
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) return null;
          const nx = dx / dist;
          const ny = dy / dist;

          const sx = x1 + nx * (isH ? nodeW / 2 + 2 : nodeW / 4);
          const sy = y1 + ny * (isH ? nodeH / 4 : nodeH / 2 + 2);
          const ex = x2 - nx * (isH ? nodeW / 2 + 10 : nodeW / 4);
          const ey = y2 - ny * (isH ? nodeH / 4 : nodeH / 2 + 10);

          return (
            <g key={`fa${i}`}>
              <motion.line
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke={a.color || C.text}
                strokeWidth={2}
                markerEnd="url(#flow-arrow)"
                initial={shouldAnimate ? { pathLength: 0, opacity: 0 } : false}
                animate={
                  shouldAnimate
                    ? { pathLength: 1, opacity: 1 }
                    : undefined
                }
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                {...(a.animated
                  ? { strokeDasharray: "6 4", strokeDashoffset: 0 }
                  : {})}
              />
              {a.label && (
                <text
                  x={(sx + ex) / 2 + (isH ? 0 : 12)}
                  y={(sy + ey) / 2 + (isH ? -8 : 0)}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="var(--font-mono)"
                  fill={C.textMuted}
                  fontWeight="bold"
                >
                  {a.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const pos = positions[i];
          const x = padX + pos.x;
          const y = padY + pos.y;
          const c = n.color || (n.highlight ? C.accent : C.text);

          return (
            <motion.g
              key={n.id}
              initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : false}
              animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
              transition={{ delay: i * 0.12, duration: 0.4, type: "spring" }}
            >
              <rect
                x={x}
                y={y}
                width={nodeW}
                height={nodeH}
                fill={n.highlight ? c : C.bgWhite}
                stroke={c}
                strokeWidth={n.highlight ? 2.5 : 2}
                rx={0}
              />
              {/* Icon */}
              {n.icon && ICONS[n.icon] && (
                <g
                  transform={`translate(${x + 10}, ${y + nodeH / 2 - 8}) scale(1)`}
                >
                  <path
                    d={ICONS[n.icon]}
                    fill="none"
                    stroke={n.highlight ? "#fff" : c}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
              <text
                x={x + (n.icon && ICONS[n.icon] ? 32 : nodeW / 2)}
                y={y + nodeH / 2 + 4}
                textAnchor={n.icon && ICONS[n.icon] ? "start" : "middle"}
                fontSize={9}
                fontFamily="var(--font-mono)"
                fontWeight="bold"
                fill={n.highlight ? "#fff" : c}
              >
                {n.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
