/**
 * Config integrity check for content repositories.
 *
 * Runs entirely on data already cached on the Convex `projects` document
 * (`configJson` + `cachedTree`, both populated by `api.github.syncProject`),
 * so no extra GitHub round-trip is needed. Reuses the canonical Zod schemas
 * from `@wikipefia/mdx-compiler/schemas` — the same ones content-repo CI uses —
 * so the admin and the build pipeline agree on what a valid config looks like.
 */

import {
  SubjectConfig,
  SystemConfig,
  TeacherConfig,
} from "@wikipefia/mdx-compiler/schemas";
import type { ProjectRecord, ProjectType, TreeEntry } from "./types";

const LOCALES = ["ru", "en", "cz"] as const;

export type DiagnosticSeverity = "error" | "warning";
export type DiagnosticCategory = "presence" | "schema" | "articles";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  message: string;
}

export type IntegrityStatus = "ok" | "warnings" | "errors" | "unsynced";

export interface IntegrityReport {
  status: IntegrityStatus;
  diagnostics: Diagnostic[];
}

const SCHEMA_BY_TYPE = {
  subject: SubjectConfig,
  teacher: TeacherConfig,
  system: SystemConfig,
} as const;

function hasConfigBlob(tree: TreeEntry[]): boolean {
  return tree.some((e) => e.path === "config.json" && e.type === "blob");
}

/** True if `articles/<locale>/<slug>.mdx` exists for any supported locale. */
function articleExists(tree: TreeEntry[], slug: string): boolean {
  return LOCALES.some((locale) =>
    tree.some(
      (e) => e.path === `articles/${locale}/${slug}.mdx` && e.type === "blob",
    ),
  );
}

/** Collect slug references that map to article files, by project type. */
function referencedArticleSlugs(type: ProjectType, config: unknown): string[] {
  const slugs: string[] = [];
  if (type === "subject") {
    const categories = (
      config as { categories?: Array<{ articles?: string[] }> }
    )?.categories;
    for (const cat of categories ?? []) {
      for (const slug of cat.articles ?? []) slugs.push(slug);
    }
  } else if (type === "teacher") {
    const sections = (config as { sections?: Array<{ articles?: string[] }> })
      ?.sections;
    for (const sec of sections ?? []) {
      for (const slug of sec.articles ?? []) slugs.push(slug);
    }
  }
  // System articles are route entries, not file references — skip.
  return slugs;
}

export function checkConfigIntegrity(project: ProjectRecord): IntegrityReport {
  const diagnostics: Diagnostic[] = [];
  const tree = project.cachedTree;

  // Never synced — we have nothing to validate against yet.
  if (!tree) {
    return { status: "unsynced", diagnostics };
  }

  // ── 1. Presence ──
  if (!hasConfigBlob(tree)) {
    diagnostics.push({
      severity: "error",
      category: "presence",
      message: "config.json is missing from the repository.",
    });
  }
  if (project.configJson == null) {
    diagnostics.push({
      severity: "error",
      category: "presence",
      message: "No parsed config.json found on the synced project.",
    });
    return { status: "errors", diagnostics };
  }

  // ── 2. Schema ──
  const schema = SCHEMA_BY_TYPE[project.type];
  const result = schema.safeParse(project.configJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "(root)";
      diagnostics.push({
        severity: "error",
        category: "schema",
        message: `${path}: ${issue.message}`,
      });
    }
  }

  // ── 3. Referenced articles exist ──
  for (const slug of referencedArticleSlugs(project.type, project.configJson)) {
    if (!articleExists(tree, slug)) {
      diagnostics.push({
        severity: "warning",
        category: "articles",
        message: `Referenced article "${slug}" has no MDX file under articles/<locale>/.`,
      });
    }
  }

  const hasError = diagnostics.some((d) => d.severity === "error");
  const hasWarning = diagnostics.some((d) => d.severity === "warning");
  return {
    status: hasError ? "errors" : hasWarning ? "warnings" : "ok",
    diagnostics,
  };
}

export const STATUS_META: Record<
  IntegrityStatus,
  { label: string; color: string }
> = {
  ok: { label: "OK", color: "#059669" },
  warnings: { label: "Warnings", color: "#D97706" },
  errors: { label: "Errors", color: "#DC2626" },
  unsynced: { label: "Not synced", color: "#6b6b6b" },
};
