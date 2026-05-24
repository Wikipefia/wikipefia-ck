/**
 * Content pipeline types — shared between build scripts and runtime.
 */

import type { Locale, LocalizedStringType } from "@/lib/schemas";
import type { ArticleFrontmatterType } from "@/lib/schemas";
import type { SubjectConfigType } from "@/lib/schemas";
import type { TeacherConfigType } from "@/lib/schemas";
import type { SystemArticleEntryType } from "@/lib/schemas";

// ── Table of Contents ──────────────────────────────────

export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

// ── Search ─────────────────────────────────────────────

export interface SearchEntry {
  id: string;
  type:
    | "subject"
    | "teacher"
    | "subject-article"
    | "teacher-article"
    | "system-article";
  slug: string;
  parentSlug?: string;
  title: string;
  description: string;
  keywords: string[];
  route: string;
  extra?: {
    difficulty?: string;
    semester?: number;
    teacherRating?: number;
  };
}

// ── Manifest ───────────────────────────────────────────

export interface ArticleManifestEntry {
  frontmatter: ArticleFrontmatterType;
  locales: Locale[];
  compiledPath: string; // template with {locale} placeholder
  tocPath: string;
  category?: string;
  section?: string;
}

export interface SubjectManifest {
  config: SubjectConfigType;
  entityType: "subject";
  resolvedTeachers: Array<{
    slug: string;
    name: LocalizedStringType;
    ratings: TeacherConfigType["ratings"];
    photo?: string;
  }>;
  articles: Record<string, ArticleManifestEntry>;
}

export interface TeacherManifest {
  config: TeacherConfigType;
  entityType: "teacher";
  resolvedSubjects: Array<{
    slug: string;
    name: LocalizedStringType;
  }>;
  articles: Record<string, ArticleManifestEntry>;
}

export interface SystemArticleManifest {
  config: SystemArticleEntryType;
  locales: Locale[];
  compiledPath: string;
  tocPath: string;
}

export interface ContentManifest {
  buildHash: string;
  buildTime: string;
  locales: Locale[];

  routeMap: Record<
    string,
    { type: "subject" | "teacher" | "system-article" }
  >;

  subjects: Record<string, SubjectManifest>;
  teachers: Record<string, TeacherManifest>;
  systemArticles: Record<string, SystemArticleManifest>;
}

export interface SearchMeta {
  hash: string;
  generatedAt: string;
}
