// Types shared by workspace UI components

export interface LocalizedString {
  ru: string;
  en: string;
  cz: string;
}

export interface SubjectCategory {
  slug: string;
  name: LocalizedString;
  articles: string[];
}

export interface SubjectMetadata {
  semester: number;
  credits: number;
  difficulty: "beginner" | "medium" | "advanced";
  department: LocalizedString;
}

export interface Subject {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  teachers: string[];
  categories: SubjectCategory[];
  metadata: SubjectMetadata;
}

export interface OpenTab {
  id: string;
  type: "article" | "metadata";
  subjectSlug: string;
  articleSlug?: string;
  label: string;
  modified: boolean;
  loading?: boolean;
}

export interface ProjectRecord {
  _id: string;
  slug: string;
  name: string;
  description: string;
  githubRepo: string;
  branch: string;
  type: "subject" | "teacher" | "system";
  // biome-ignore lint/suspicious/noExplicitAny: dynamic config from repo
  configJson?: any;
  cachedTree?: { path: string; type: string; sha: string; size?: number }[];
  lastSynced?: number;
}

// ── Helpers ──

export function createTabId(
  type: "article" | "metadata",
  subjectSlug: string,
  articleSlug?: string,
): string {
  if (type === "metadata") return `meta:${subjectSlug}`;
  return `file:${subjectSlug}/${articleSlug}`;
}

export function getArticleTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const emptyLocalized: LocalizedString = { en: "", ru: "", cz: "" };

/** Convert a Convex project record (with synced configJson) into a Subject for UI */
export function projectToSubject(project: ProjectRecord): Subject {
  const cfg = project.configJson;
  if (!cfg) {
    return {
      slug: project.slug,
      name: { en: project.name, ru: project.name, cz: project.name },
      description: {
        en: project.description,
        ru: project.description,
        cz: project.description,
      },
      teachers: [],
      categories: [],
      metadata: {
        semester: 0,
        credits: 0,
        difficulty: "medium",
        department: emptyLocalized,
      },
    };
  }

  return {
    slug: cfg.slug ?? project.slug,
    name: cfg.name ?? { en: project.name, ru: project.name, cz: project.name },
    description: cfg.description ?? {
      en: project.description,
      ru: "",
      cz: "",
    },
    teachers: cfg.teachers ?? [],
    categories: (cfg.categories ?? []).map(
      (c: { slug: string; name: LocalizedString; articles: string[] }) => ({
        slug: c.slug,
        name: c.name,
        articles: c.articles ?? [],
      }),
    ),
    metadata: {
      semester: cfg.metadata?.semester ?? 0,
      credits: cfg.metadata?.credits ?? 0,
      difficulty: cfg.metadata?.difficulty ?? "medium",
      department: cfg.metadata?.department ?? emptyLocalized,
    },
  };
}

/** Split source into frontmatter block and body */
export function splitFrontmatter(source: string): {
  frontmatter: string;
  body: string;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: "", body: source };
  return { frontmatter: match[0], body: source.slice(match[0].length) };
}

/** Build the file path for an article in a content repo */
export function articlePath(slug: string, locale = "en"): string {
  return `articles/${locale}/${slug}.mdx`;
}
