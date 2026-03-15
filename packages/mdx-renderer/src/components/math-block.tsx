import type { ReactNode } from "react";
import { C } from "../theme";

interface MathBlockProps {
  children: ReactNode;
}

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
