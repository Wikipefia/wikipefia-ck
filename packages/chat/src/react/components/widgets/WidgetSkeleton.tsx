"use client";

import { motion } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { catalogEntries } from "@wikipefia/mdx-renderer/registry";

interface WidgetSkeletonProps {
  toolName: string;
  /** Optional partial args being streamed; we just count their progress. */
  partialArgsKeyCount?: number;
}

const ENTRY_BY_NAME = new Map(catalogEntries.map((e) => [e.name, e]));

/**
 * Shown while a tool call is still streaming (`state === "partial"`).
 * Communicates: "the model is currently constructing widget X".
 */
export function WidgetSkeleton({
  toolName,
  partialArgsKeyCount = 0,
}: WidgetSkeletonProps) {
  const meta = ENTRY_BY_NAME.get(toolName);
  const icon = meta?.icon ?? "◇";
  const label = meta?.label ?? toolName;

  return (
    <div
      className="border-2 my-4"
      style={{ borderColor: C.border, backgroundColor: C.bg }}
    >
      <div
        className="px-4 py-2.5 border-b-2 flex items-center justify-between"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          {icon} {label}
        </span>
        <motion.span
          className="text-[9px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText, opacity: 0.6 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          generating…
        </motion.span>
      </div>
      <div className="px-4 py-6 flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-3"
            style={{ backgroundColor: C.borderLight }}
            initial={{ width: "0%" }}
            animate={{
              width: ["20%", "70%", "40%"],
              opacity: partialArgsKeyCount > i ? 1 : 0.5,
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 1.6,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
