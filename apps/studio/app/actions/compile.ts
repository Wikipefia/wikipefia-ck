"use server";

import { compileMDX } from "@wikipefia/mdx-compiler/compile";

export interface CompileActionResult {
  success: boolean;
  compiled?: string;
  toc?: { id: string; text: string; depth: number }[];
  diagnostics?: { message: string; severity: string }[];
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

export async function compileAction(
  source: string
): Promise<CompileActionResult> {
  if (!source.trim()) {
    return { success: true, compiled: "", toc: [], diagnostics: [] };
  }

  try {
    const result = await compileMDX(source, {
      filePath: "studio-editor.mdx",
      validateComponents: true,
    });

    return {
      success: true,
      compiled: result.compiled,
      toc: result.toc,
      diagnostics: result.diagnostics.map((d) => ({
        message: d.message,
        severity: d.severity,
      })),
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
    };
  }
}
