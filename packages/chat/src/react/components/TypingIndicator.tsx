"use client";

import { motion } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";

export function TypingIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider ml-2"
      style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
    >
      <span>•</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            delay: i * 0.15,
          }}
        >
          ·
        </motion.span>
      ))}
    </span>
  );
}
