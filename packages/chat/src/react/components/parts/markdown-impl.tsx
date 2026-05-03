"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { createTypography } from "@wikipefia/mdx-renderer";

const typography = createTypography();

// Plugin arrays are module-level so they keep the same identity across
// renders — react-markdown caches based on identity.
//
// remarkBreaks: convert SOFT line breaks ("\n") into hard <br> nodes. The
// model frequently emits free-form prose where each visual line is a single
// "\n" rather than the "\n\n" that strict CommonMark requires for a new
// paragraph. Without this plugin those single-\n joins collapse into one
// run-on paragraph (visible inside Comparison/Tabs/StepByStep content
// where the model used "\n" between bullets).
const REMARK_PLUGINS = [remarkGfm, remarkBreaks, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

/**
 * The actual heavy markdown renderer. Imported via React.lazy from TextPart
 * so the bundle for this is its own chunk (downloaded only when a message
 * with text content is rendered).
 */
export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={typography}
    >
      {text}
    </ReactMarkdown>
  );
}
