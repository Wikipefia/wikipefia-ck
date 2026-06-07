"use client";

import { motion } from "framer-motion";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

export interface DotsProps {
  className?: string;
  /** Optional leading glyph (e.g. "•"). */
  lead?: string;
}

/** Animated "typing" dots. */
export function Dots({ className, lead }: DotsProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted",
        className,
      )}
      style={{ fontFamily: font.mono }}
    >
      {lead ? <span>{lead}</span> : null}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
        >
          ·
        </motion.span>
      ))}
    </span>
  );
}
