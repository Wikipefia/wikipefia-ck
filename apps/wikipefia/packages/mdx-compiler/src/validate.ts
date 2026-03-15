/**
 * validateMDX — Full validation of an MDX file without producing build output.
 *
 * Performs:
 *   1. Frontmatter parsing and schema validation
 *   2. Trial MDX compilation (catches syntax errors)
 *   3. Component usage validation (props, nesting, unknown components)
 *   4. Slug consistency check (frontmatter slug vs filename)
 *
 * Used by: content repo CI, pre-commit hooks, CLI.
 */

import path from "path";
import matter from "gray-matter";
import { compileMDX, type ComponentDiagnostic } from "./compile.js";
import { ArticleFrontmatter } from "./schemas/article.js";

export interface ValidationDiagnostic {
  message: string;
  severity: "error" | "warning";
  line?: number;
  column?: number;
  /** Diagnostic category. */
  category: "frontmatter" | "mdx-syntax" | "component" | "structure";
}

export interface ValidationResult {
  /** True if no errors (warnings are OK). */
  valid: boolean;
  /** All diagnostics found. */
  diagnostics: ValidationDiagnostic[];
  /** Parsed frontmatter (null if parsing failed). */
  frontmatter: Record<string, unknown> | null;
}

export interface ValidateOptions {
  /** File path — used for error reporting and slug checking. */
  filePath: string;
  /**
   * If true, skips the trial MDX compilation step (faster, but
   * won't catch syntax errors). Default: false.
   */
  skipCompile?: boolean;
}

/**
 * Validate a single MDX file. Returns a result object with all diagnostics.
 * Never throws — all errors are captured as diagnostics.
 */
export async function validateMDX(
  source: string,
  options: ValidateOptions
): Promise<ValidationResult> {
  const { filePath, skipCompile = false } = options;
  const diagnostics: ValidationDiagnostic[] = [];
  let frontmatterData: Record<string, unknown> | null = null;

  // ── 1. Parse and validate frontmatter ──────────────

  let content: string;
  try {
    const parsed = matter(source);
    frontmatterData = parsed.data as Record<string, unknown>;
    content = parsed.content;
  } catch (err) {
    diagnostics.push({
      message: `Failed to parse frontmatter: ${err}`,
      severity: "error",
      category: "frontmatter",
    });
    return { valid: false, diagnostics, frontmatter: null };
  }

  // Validate against schema
  const schemaResult = ArticleFrontmatter.safeParse(frontmatterData);
  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      diagnostics.push({
        message: `Frontmatter: ${issue.path.join(".")}: ${issue.message}`,
        severity: "error",
        category: "frontmatter",
      });
    }
  } else {
    // ── 2. Check slug consistency ──────────────────
    const expectedSlug = path.basename(filePath, ".mdx");
    if (
      expectedSlug !== "_front" &&
      schemaResult.data.slug !== expectedSlug
    ) {
      diagnostics.push({
        message: `Frontmatter slug "${schemaResult.data.slug}" does not match filename "${expectedSlug}"`,
        severity: "error",
        category: "structure",
      });
    }
  }

  // ── 3. Trial compile (catches syntax + component issues) ──

  if (!skipCompile) {
    try {
      const result = await compileMDX(content, {
        filePath,
        validateComponents: true,
      });

      // Convert component diagnostics to validation diagnostics
      for (const cd of result.diagnostics) {
        diagnostics.push({
          message: cd.message,
          severity: cd.severity,
          line: cd.line,
          column: cd.column,
          category: "component",
        });
      }
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      diagnostics.push({
        message: `MDX syntax error: ${(error.message as string) || String(err)}`,
        severity: "error",
        line: error.line as number | undefined,
        column: error.column as number | undefined,
        category: "mdx-syntax",
      });
    }
  }

  const hasErrors = diagnostics.some((d) => d.severity === "error");
  return {
    valid: !hasErrors,
    diagnostics,
    frontmatter: frontmatterData,
  };
}

/**
 * Validate all MDX files in a directory structure.
 *
 * Expects the directory layout:
 *   articles/{locale}/*.mdx
 *
 * Returns a map of filePath → ValidationResult.
 */
export async function validateDirectory(
  articlesDir: string
): Promise<Map<string, ValidationResult>> {
  const { readdir, readFile, stat } = await import("fs/promises");
  const { existsSync } = await import("fs");
  const { LOCALES } = await import("./schemas/shared.js");

  const results = new Map<string, ValidationResult>();

  for (const locale of LOCALES) {
    const localeDir = path.join(articlesDir, locale);
    if (!existsSync(localeDir)) continue;

    const entries = await readdir(localeDir);
    const mdxFiles = entries.filter((f) => f.endsWith(".mdx"));

    for (const file of mdxFiles) {
      const filePath = path.join(localeDir, file);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) continue;

      const source = await readFile(filePath, "utf-8");
      const relativePath = `${locale}/${file}`;
      const result = await validateMDX(source, { filePath: relativePath });
      results.set(relativePath, result);
    }
  }

  return results;
}
