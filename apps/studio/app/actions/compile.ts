"use server";

import { compileMDX } from "@wikipefia/mdx-compiler/compile";

/**
 * File path used as the `fileName` annotation on JSX nodes when
 * compiling MDX in development mode. The client receives this back
 * on every result via the `virtualPath` field and feeds it to the
 * preview's error locator so positions in error stacks can be
 * recognized as pointing at the user's MDX source.
 *
 * Defined as a local constant — `"use server"` modules may only
 * export async functions, so this is intentionally not exported.
 */
const STUDIO_VIRTUAL_PATH = "studio-editor.mdx";

export interface CompileActionResult {
  success: boolean;
  compiled?: string;
  toc?: { id: string; text: string; depth: number }[];
  diagnostics?: { message: string; severity: string }[];
  error?: string;
  errorLine?: number;
  errorColumn?: number;
  /**
   * Number of lines occupied by the YAML frontmatter that was stripped
   * before compiling. MDX line numbers in compiled output are
   * 1-indexed against the post-strip source; add this offset to map
   * back to the line the user sees in the editor.
   */
  frontmatterLines?: number;
  /** Virtual file path embedded into compiled JSX source positions. */
  virtualPath?: string;
}

/** Strip YAML frontmatter (--- ... ---) and return the stripped source plus its line count. */
function stripFrontmatter(source: string): { body: string; lineCount: number } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { body: source, lineCount: 0 };
  const removed = match[0];
  // Count newlines in the removed block — that's the offset between
  // post-strip line numbers and the editor's line numbers.
  let lineCount = 0;
  for (let i = 0; i < removed.length; i++) {
    if (removed.charCodeAt(i) === 10 /* \n */) lineCount++;
  }
  return { body: source.slice(removed.length), lineCount };
}

export async function compileAction(
  source: string,
): Promise<CompileActionResult> {
  if (!source.trim()) {
    return {
      success: true,
      compiled: "",
      toc: [],
      diagnostics: [],
      frontmatterLines: 0,
      virtualPath: STUDIO_VIRTUAL_PATH,
    };
  }

  const { body, lineCount: frontmatterLines } = stripFrontmatter(source);

  try {
    const result = await compileMDX(body, {
      filePath: STUDIO_VIRTUAL_PATH,
      validateComponents: true,
      // Enable dev mode so compiled JSX carries source positions —
      // the live preview's error boundary uses these to highlight
      // the offending line in the editor.
      development: true,
    });

    return {
      success: true,
      compiled: result.compiled,
      toc: result.toc,
      diagnostics: result.diagnostics.map((d) => ({
        message: d.message,
        severity: d.severity,
      })),
      frontmatterLines,
      virtualPath: STUDIO_VIRTUAL_PATH,
    };
  } catch (err: unknown) {
    const error = err as Record<string, unknown>;
    return {
      success: false,
      error:
        (error.reason as string) ??
        (error.message as string) ??
        String(err),
      errorLine: (error.line as number) ?? undefined,
      errorColumn: (error.column as number) ?? undefined,
      frontmatterLines,
      virtualPath: STUDIO_VIRTUAL_PATH,
    };
  }
}
