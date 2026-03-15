/**
 * @wikipefia/mdx-compiler — Shared MDX compilation and validation.
 *
 * This package is the single source of truth for:
 *   - MDX compilation pipeline (plugins, config)
 *   - Content schemas (Zod)
 *   - Component contracts (prop types, nesting rules)
 *   - Validation logic
 *
 * Used by:
 *   - Main project (build-content.ts) — for actual compilation
 *   - Content repos (CI / pre-commit) — for validation
 */

// ── Core ─────────────────────────────────────────────
export {
  compileMDX,
  MDXCompileError,
  type CompileResult,
  type CompileOptions,
  type TocEntry,
  type ComponentDiagnostic,
} from "./compile.js";

export {
  validateMDX,
  validateDirectory,
  type ValidationResult,
  type ValidationDiagnostic,
  type ValidateOptions,
} from "./validate.js";

// ── Schemas ──────────────────────────────────────────
export {
  LocalizedString,
  LocalizedKeywords,
  LOCALES,
  type Locale,
} from "./schemas/shared.js";

export { ArticleFrontmatter } from "./schemas/article.js";
export { SubjectConfig } from "./schemas/subject.js";
export { TeacherConfig } from "./schemas/teacher.js";
export { SystemArticleEntry, SystemConfig } from "./schemas/system.js";

// ── Component Registry ───────────────────────────────
export {
  componentRegistry,
  knownComponentNames,
  type ComponentContract,
  type PropContract,
  type PropType,
} from "./components/registry.js";

// ── Plugins (for advanced use) ───────────────────────
export { remarkValidateComponents } from "./plugins/remark-validate-components.js";
export { rehypeExtractToc } from "./plugins/rehype-extract-toc.js";
