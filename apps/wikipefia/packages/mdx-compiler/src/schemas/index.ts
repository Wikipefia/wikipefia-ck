/**
 * All Zod schemas — single source of truth for content validation.
 */

export {
  LocalizedString,
  LocalizedKeywords,
  LOCALES,
  type Locale,
} from "./shared.js";

export { ArticleFrontmatter } from "./article.js";

export { SubjectConfig } from "./subject.js";

export { TeacherConfig } from "./teacher.js";

export { SystemArticleEntry, SystemConfig } from "./system.js";
