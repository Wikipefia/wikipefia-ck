/**
 * compileMDX — The single compilation function.
 *
 * Uses the exact same plugin chain everywhere: main project build,
 * content repo validation, CI checks. Zero drift.
 */

import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";

import { rehypeExtractToc, type TocEntry } from "./plugins/rehype-extract-toc.js";
import {
  remarkValidateComponents,
  type ComponentDiagnostic,
} from "./plugins/remark-validate-components.js";

export { type TocEntry } from "./plugins/rehype-extract-toc.js";
export { type ComponentDiagnostic } from "./plugins/remark-validate-components.js";

export interface CompileResult {
  /** Pre-compiled JavaScript (function-body format). */
  compiled: string;
  /** Extracted table of contents. */
  toc: TocEntry[];
  /** Component usage diagnostics (warnings / errors). */
  diagnostics: ComponentDiagnostic[];
}

export interface CompileOptions {
  /**
   * File path for error reporting. Not used for reading —
   * source content is passed directly.
   */
  filePath?: string;
  /**
   * If true, component validation diagnostics are collected but
   * don't prevent compilation. If false (default), errors in
   * component usage are collected but compilation still proceeds
   * (caller decides what to do with them).
   */
  validateComponents?: boolean;
}

/**
 * Compile MDX source to pre-compiled JavaScript.
 *
 * This function is the single source of truth for the MDX pipeline.
 * Both the main project's `build-content.ts` and content repos' CI
 * call this exact function.
 */
export async function compileMDX(
  source: string,
  options: CompileOptions = {}
): Promise<CompileResult> {
  const { filePath = "<unknown>", validateComponents = true } = options;

  const tocStore: TocEntry[] = [];
  const diagnostics: ComponentDiagnostic[] = [];

  // Build remark plugins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remarkPlugins: any[] = [remarkGfm, remarkMath];

  if (validateComponents) {
    remarkPlugins.push(
      remarkValidateComponents({
        onDiagnostic: (d) => diagnostics.push(d),
      })
    );
  }

  try {
    const vfile = await compile(source, {
      outputFormat: "function-body",
      development: false,
      remarkPlugins,
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: "wrap" }],
        rehypeKatex,
        rehypeExtractToc(tocStore),
      ],
    });

    return {
      compiled: String(vfile),
      toc: tocStore,
      diagnostics,
    };
  } catch (err: unknown) {
    const error = err as Record<string, unknown>;
    const line = (error.line as number) ?? undefined;
    const column = (error.column as number) ?? undefined;
    const reason =
      (error.reason as string) ??
      (error.message as string) ??
      String(err);

    // Enhance the error with structured context
    const enhanced = new MDXCompileError(reason, {
      filePath,
      line,
      column,
      ruleId: error.ruleId as string | undefined,
      source: error.source as string | undefined,
      url: error.url as string | undefined,
    });

    throw enhanced;
  }
}

/**
 * Structured MDX compilation error with file context.
 */
export class MDXCompileError extends Error {
  filePath: string;
  line?: number;
  column?: number;
  ruleId?: string;
  source?: string;
  url?: string;

  constructor(
    reason: string,
    context: {
      filePath: string;
      line?: number;
      column?: number;
      ruleId?: string;
      source?: string;
      url?: string;
    }
  ) {
    super(reason);
    this.name = "MDXCompileError";
    this.filePath = context.filePath;
    this.line = context.line;
    this.column = context.column;
    this.ruleId = context.ruleId;
    this.source = context.source;
    this.url = context.url;
  }

  /**
   * Pretty-print the error with source context.
   */
  format(sourceContent?: string): string {
    const lines: string[] = [];
    lines.push("═".repeat(56));
    lines.push("MDX COMPILATION ERROR");
    lines.push("═".repeat(56));
    lines.push(`File:   ${this.filePath}`);
    lines.push(`Line:   ${this.line ?? "?"}, Column: ${this.column ?? "?"}`);
    lines.push(`Reason: ${this.message}`);

    if (this.ruleId) {
      lines.push(`Rule:   ${this.ruleId} (${this.source || "unknown"})`);
    }
    if (this.url) {
      lines.push(`Docs:   ${this.url}`);
    }

    // Show source context if available
    if (sourceContent && typeof this.line === "number" && this.line > 0) {
      const sourceLines = sourceContent.split("\n");
      const start = Math.max(0, this.line - 4);
      const end = Math.min(sourceLines.length, this.line + 2);
      lines.push("");
      lines.push("Source context:");
      for (let i = start; i < end; i++) {
        const lineNum = i + 1;
        const marker = lineNum === this.line ? " >>>" : "    ";
        lines.push(`${marker} ${String(lineNum).padStart(4)} | ${sourceLines[i]}`);
      }
    }

    lines.push("═".repeat(56));
    return lines.join("\n");
  }
}
