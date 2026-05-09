"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { createTypography } from "@wikipefia/mdx-renderer";
import { normalizeLatexDelimiters } from "../parts/normalize-latex";

const typography = createTypography();

/**
 * Inline-only typography overrides: react-markdown wraps top-level text in
 * `<p>`. Inside table cells, quiz options, button labels, etc., that adds
 * a paragraph block with margin and breaks the visual rhythm. We render
 * the children as a fragment instead.
 */
const INLINE_TYPOGRAPHY = {
  ...typography,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: ({ children }: any) => <>{children}</>,
};

// Module-level so react-markdown's plugin identity check doesn't recreate
// these on every render.
const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

export interface InlineMarkdownProps {
  text: string;
}

/**
 * Inline markdown + LaTeX renderer for places where a paragraph block would
 * break the layout: DataTable cells/headers, quiz options/explanations,
 * Comparison item titles, etc.
 *
 * Supports:
 *   - inline `$...$` LaTeX (KaTeX) and the few markdown features that
 *     visually fit on a single line (bold, italic, code, links).
 *   - GFM extras (strikethrough, autolinks).
 *
 * Intentionally does NOT enable `remark-breaks` — these contexts are
 * single-line by definition; if the model emits "\n" inside a quiz option,
 * it almost certainly meant to make a separate question/option, not a
 * visual line break.
 */
export function InlineMarkdown({ text }: InlineMarkdownProps) {
  const normalized = normalizeLatexDelimiters(text);
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={INLINE_TYPOGRAPHY}
    >
      {normalized}
    </ReactMarkdown>
  );
}
