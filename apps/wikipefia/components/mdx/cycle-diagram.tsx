"use client";

import { Children, type ReactNode, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { C } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

/* ═══════════════════════════════════════════════════
   Data-carrier component
   ═══════════════════════════════════════════════════ */

interface CycleNodeProps {
  label: string;
  color?: string;
  description?: string;
  icon?: string;
}

export function CycleNode(_: CycleNodeProps) {
  return null;
}

/* ═══════════════════════════════════════════════════
   CycleDiagram component
   ═══════════════════════════════════════════════════ */

interface CycleDiagramProps {
  title?: string;
  size?: number;
  animate?: boolean;
  clockwise?: boolean;
  children: ReactNode;
}

export function CycleDiagram({
  title,
  size = 380,
  animate = true,
  clockwise = true,
  children,
}: CycleDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const shouldAnimate = animate && inView;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  /* ── Extract nodes ── */
  const nodes: CycleNodeProps[] = [];
  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;
    if (typeof p.label === "string") nodes.push(p as CycleNodeProps);
  });

  const n = nodes.length;
  if (n === 0) return null;

  /* ── Layout: nodes on a circle ── */
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;
  const nodeR = 36;

  const positions = nodes.map((_, i) => {
    const angle =
      -Math.PI / 2 + (clockwise ? 1 : -1) * ((2 * Math.PI * i) / n);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  /* ── Curved arrow paths between consecutive nodes ── */
  const arrowPaths = nodes.map((_, i) => {
    const next = (i + 1) % n;
    const p1 = positions[i];
    const p2 = positions[next];

    // Direction from p1 to p2
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    // Start/end offset from node center (past the circle edge)
    const startX = p1.x + nx * (nodeR + 6);
    const startY = p1.y + ny * (nodeR + 6);
    const endX = p2.x - nx * (nodeR + 12);
    const endY = p2.y - ny * (nodeR + 12);

    // Control point: offset perpendicular to the line, curving outward
    const perpX = -ny;
    const perpY = nx;
    const bulge = dist * 0.25 * (clockwise ? 1 : -1);
    const midX = (startX + endX) / 2 + perpX * bulge;
    const midY = (startY + endY) / 2 + perpY * bulge;

    return `M${startX},${startY} Q${midX},${midY} ${endX},${endY}`;
  });

  const PALETTE = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2"];

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
            ↻ {title}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto block"
        style={{ backgroundColor: C.bg }}
      >
        <defs>
          <marker
            id="cycle-arrow"
            viewBox="0 0 10 8"
            refX="9"
            refY="4"
            markerWidth="7"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0L10 4L0 8z" fill={C.text} />
          </marker>
        </defs>

        {/* Arrows */}
        {arrowPaths.map((d, i) => (
          <motion.path
            key={`ca${i}`}
            d={d}
            fill="none"
            stroke={C.text}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            markerEnd="url(#cycle-arrow)"
            initial={shouldAnimate ? { pathLength: 0, opacity: 0 } : false}
            animate={
              shouldAnimate ? { pathLength: 1, opacity: 0.6 } : undefined
            }
            transition={{ delay: 0.4 + i * 0.15, duration: 0.6 }}
          />
        ))}

        {/* Nodes */}
        {positions.map((pos, i) => {
          const node = nodes[i];
          const c = node.color || PALETTE[i % PALETTE.length];
          const isHovered = hoveredIdx === i;

          return (
            <motion.g
              key={i}
              initial={shouldAnimate ? { opacity: 0, scale: 0 } : false}
              animate={
                shouldAnimate
                  ? { opacity: 1, scale: isHovered ? 1.08 : 1 }
                  : { scale: isHovered ? 1.08 : 1 }
              }
              transition={{
                delay: shouldAnimate ? i * 0.12 : 0,
                duration: 0.4,
                type: "spring",
                stiffness: 200,
              }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              {/* Outer ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeR}
                fill={C.bgWhite}
                stroke={c}
                strokeWidth={2.5}
              />
              {/* Inner accent */}
              <circle cx={pos.x} cy={pos.y} r={nodeR - 6} fill={c} opacity={0.08} />

              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fontFamily="var(--font-mono)"
                fontWeight="bold"
                fill={c}
              >
                {node.label.length > 12
                  ? node.label.slice(0, 11) + "…"
                  : node.label}
              </text>

              {/* Description tooltip on hover */}
              {isHovered && node.description && (
                <g>
                  <rect
                    x={pos.x - 70}
                    y={pos.y + nodeR + 8}
                    width={140}
                    height={28}
                    fill={C.text}
                    rx={0}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + nodeR + 25}
                    textAnchor="middle"
                    fontSize={7}
                    fontFamily="var(--font-mono)"
                    fill={C.bgWhite}
                  >
                    {node.description.length > 40
                      ? node.description.slice(0, 39) + "…"
                      : node.description}
                  </text>
                </g>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
