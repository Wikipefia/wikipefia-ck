import type { ReactNode } from "react";
import { C } from "@/lib/theme";

interface MathBlockProps {
  children: ReactNode;
}

/**
 * MathBlock — display-math wrapper component.
 *
 * Prefer using $$...$$ in MDX content (processed by remark-math + rehype-katex).
 * This component exists as a fallback for cases where a component wrapper is needed.
 * Content inside is rendered as-is in a centered block.
 */
export function MathBlock({ children }: MathBlockProps) {
  return (
    <div
      className="mb-6 py-4 px-6 text-center overflow-x-auto"
      style={{
        backgroundColor: C.bg,
        borderTop: `1px solid ${C.borderLight}`,
        borderBottom: `1px solid ${C.borderLight}`,
        fontFamily: "var(--font-serif)",
        fontSize: "16px",
      }}
    >
      {children}
    </div>
  );
}
