"use client";

import { lazy, memo, Suspense } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";

interface TextPartProps {
  text: string;
  /** When true, render in a "muted" style for system / pending placeholders. */
  muted?: boolean;
}

// Heavy markdown stack (react-markdown + remark-gfm + remark-math + rehype-katex
// + createTypography from mdx-renderer) is loaded as a separate chunk on first
// text-render. This keeps the initial bundle slim — empty / loading pages don't
// pay the cost.
const Markdown = lazy(() =>
  import("./markdown-impl").then((m) => ({ default: m.Markdown })),
);

function TextPartImpl({ text, muted }: TextPartProps) {
  return (
    <div
      className="text-[15px] leading-[1.75] prose-wiki"
      style={{
        fontFamily: "var(--font-serif)",
        color: muted ? C.textMuted : C.text,
      }}
    >
      <Suspense fallback={<span style={{ whiteSpace: "pre-wrap" }}>{text}</span>}>
        <Markdown text={text} />
      </Suspense>
    </div>
  );
}

export const TextPart = memo(TextPartImpl);
