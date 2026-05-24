#!/usr/bin/env tsx
/**
 * build-content.ts — Core content build pipeline.
 *
 * Reads raw content from content/, validates schemas, compiles MDX,
 * resolves relationships, generates search indexes, and outputs
 * everything to .content-build/.
 */

import { readFile, writeFile, mkdir, readdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import matter from "gray-matter";
import { z } from "zod/v4";

// ── @wikipefia/mdx-compiler — single source of truth ──
import {
  compileMDX,
  MDXCompileError,
  SubjectConfig,
  TeacherConfig,
  SystemArticleEntry,
  SystemConfig,
  ArticleFrontmatter,
  LOCALES,
  type Locale,
  type TocEntry,
} from "@wikipefia/mdx-compiler";

// ── Constants ──────────────────────────────────────────

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const BUILD_DIR = path.join(ROOT, ".content-build");

const RESERVED_SLUGS = ["api", "_next", "not-found", "search"];

// ── Types ──────────────────────────────────────────────

interface SearchEntry {
  id: string;
  type: string;
  slug: string;
  parentSlug?: string;
  title: string;
  description: string;
  keywords: string[];
  route: string;
  extra?: Record<string, unknown>;
}

// ── Utility Functions ──────────────────────────────────

function log(msg: string) {
  console.log(`  ${msg}`);
}

function logSection(msg: string) {
  console.log(`\n▸ ${msg}`);
}

function logError(msg: string) {
  console.error(`  ✗ ${msg}`);
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function readJson(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeJson(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function writeText(filePath: string, data: string) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, data, "utf-8");
}

async function listDirs(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function listFiles(dir: string, ext?: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && (!ext || e.name.endsWith(ext)))
    .map((e) => e.name);
}

// ── Step 1: Load Configs ───────────────────────────────

interface LoadedSubject {
  config: z.infer<typeof SubjectConfig>;
  dir: string;
}

interface LoadedTeacher {
  config: z.infer<typeof TeacherConfig>;
  dir: string;
}

interface LoadedSystem {
  config: z.infer<typeof SystemConfig>;
  dir: string;
}

async function loadSubjects(): Promise<LoadedSubject[]> {
  const subjectsDir = path.join(CONTENT_DIR, "subjects");
  const slugs = await listDirs(subjectsDir);
  const results: LoadedSubject[] = [];

  for (const slug of slugs) {
    const dir = path.join(subjectsDir, slug);
    const configPath = path.join(dir, "config.json");
    if (!existsSync(configPath)) {
      logError(`Missing config.json for subject: ${slug}`);
      continue;
    }
    const raw = await readJson(configPath);
    const parsed = SubjectConfig.safeParse(raw);
    if (!parsed.success) {
      logError(`Validation error in subject ${slug}/config.json:`);
      for (const issue of parsed.error.issues) {
        logError(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    results.push({ config: parsed.data, dir });
  }

  return results;
}

async function loadTeachers(): Promise<LoadedTeacher[]> {
  const teachersDir = path.join(CONTENT_DIR, "teachers");
  const slugs = await listDirs(teachersDir);
  const results: LoadedTeacher[] = [];

  for (const slug of slugs) {
    const dir = path.join(teachersDir, slug);
    const configPath = path.join(dir, "config.json");
    if (!existsSync(configPath)) {
      logError(`Missing config.json for teacher: ${slug}`);
      continue;
    }
    const raw = await readJson(configPath);
    const parsed = TeacherConfig.safeParse(raw);
    if (!parsed.success) {
      logError(`Validation error in teacher ${slug}/config.json:`);
      for (const issue of parsed.error.issues) {
        logError(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    results.push({ config: parsed.data, dir });
  }

  return results;
}

async function loadSystem(): Promise<LoadedSystem | null> {
  const systemDir = path.join(CONTENT_DIR, "system");
  const configPath = path.join(systemDir, "config.json");
  if (!existsSync(configPath)) {
    log("No system config found — skipping system articles.");
    return null;
  }
  const raw = await readJson(configPath);
  const parsed = SystemConfig.safeParse(raw);
  if (!parsed.success) {
    logError(`Validation error in system/config.json:`);
    for (const issue of parsed.error.issues) {
      logError(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return { config: parsed.data, dir: systemDir };
}

// ── Step 2: Validate Routes ────────────────────────────

function validateRoutes(
  subjects: LoadedSubject[],
  teachers: LoadedTeacher[],
  system: LoadedSystem | null
) {
  const errors: string[] = [];
  const slugRegistry = new Map<string, { type: string; source: string }>();

  function registerSlug(slug: string, type: string, source: string) {
    if (RESERVED_SLUGS.includes(slug)) {
      errors.push(
        `RESERVED SLUG: ${type} "${slug}" uses a reserved slug.\n` +
          `  Source: ${source}\n` +
          `  Reserved: ${RESERVED_SLUGS.join(", ")}`
      );
      return;
    }
    const existing = slugRegistry.get(slug);
    if (existing) {
      errors.push(
        `SLUG COLLISION: "${slug}" claimed by both:\n` +
          `  1. ${existing.type} (${existing.source})\n` +
          `  2. ${type} (${source})\n` +
          `  Fix: Rename one to use a different slug.`
      );
      return;
    }
    slugRegistry.set(slug, { type, source });
  }

  for (const s of subjects) {
    registerSlug(
      s.config.slug,
      "Subject",
      `content/subjects/${s.config.slug}/config.json`
    );
  }

  for (const t of teachers) {
    registerSlug(
      t.config.slug,
      "Teacher",
      `content/teachers/${t.config.slug}/config.json`
    );
  }

  if (system) {
    for (const a of system.config.articles) {
      registerSlug(a.slug, "System Article", `content/system/config.json`);
    }
  }

  // Check for article slug duplicates within each subject
  for (const s of subjects) {
    const articleSlugs = new Set<string>();
    for (const cat of s.config.categories) {
      for (const articleSlug of cat.articles) {
        if (articleSlugs.has(articleSlug)) {
          errors.push(
            `ARTICLE DUPLICATE: Subject "${s.config.slug}" lists article "${articleSlug}" in multiple categories.`
          );
        }
        articleSlugs.add(articleSlug);
      }
    }
  }

  if (errors.length > 0) {
    console.error("\n" + "=".repeat(60));
    console.error("  ROUTE VALIDATION FAILED");
    console.error("=".repeat(60) + "\n");
    errors.forEach((e, i) => console.error(`[${i + 1}] ${e}\n`));
    console.error(`Total errors: ${errors.length}`);
    process.exit(1);
  }

  log(`Route validation passed. ${slugRegistry.size} unique slugs.`);
  return slugRegistry;
}

// ── Step 3: Compile MDX ────────────────────────────────

async function compileMDXFile(
  source: string,
  filePath: string
): Promise<{ compiled: string; toc: TocEntry[] }> {
  try {
    const result = await compileMDX(source, { filePath, validateComponents: true });

    // Log component warnings (non-fatal)
    for (const d of result.diagnostics) {
      if (d.severity === "warning") {
        console.warn(`  ⚠ ${filePath}: ${d.message}${d.line ? ` (line ${d.line})` : ""}`);
      } else if (d.severity === "error") {
        logError(`${filePath}: ${d.message}${d.line ? ` (line ${d.line})` : ""}`);
      }
    }

    return { compiled: result.compiled, toc: result.toc };
  } catch (err) {
    if (err instanceof MDXCompileError) {
      console.error("");
      console.error("  " + err.format(source).split("\n").join("\n  "));
      console.error("");
    }
    throw err;
  }
}

async function processArticles(
  articlesDir: string,
  entitySlug: string,
  entityType: "subjects" | "teachers"
): Promise<{
  articles: Record<
    string,
    {
      frontmatter: z.infer<typeof ArticleFrontmatter>;
      locales: Locale[];
      compiledPath: string;
      tocPath: string;
      category?: string;
      section?: string;
    }
  >;
}> {
  const articles: Record<string, any> = {};

  for (const locale of LOCALES) {
    const localeDir = path.join(articlesDir, locale);
    if (!existsSync(localeDir)) continue;

    const mdxFiles = await listFiles(localeDir, ".mdx");

    for (const file of mdxFiles) {
      const filePath = path.join(localeDir, file);
      const raw = await readFile(filePath, "utf-8");
      const { data: frontmatterRaw, content } = matter(raw);

      // Validate frontmatter
      const parsed = ArticleFrontmatter.safeParse(frontmatterRaw);
      if (!parsed.success) {
        logError(
          `Frontmatter error in ${entityType}/${entitySlug}/articles/${locale}/${file}:`
        );
        for (const issue of parsed.error.issues) {
          logError(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
        process.exit(1);
      }

      const fm = parsed.data;
      const articleSlug = fm.slug;

      // Initialize article entry if first locale
      if (!articles[articleSlug]) {
        articles[articleSlug] = {
          frontmatter: fm,
          locales: [],
          compiledPath: `compiled/${entityType}/${entitySlug}/{locale}/${articleSlug}.mjs`,
          tocPath: `toc/${entityType}/${entitySlug}/{locale}/${articleSlug}.json`,
        };
      }

      articles[articleSlug].locales.push(locale);

      // Compile MDX
      const relPath = `${entityType}/${entitySlug}/articles/${locale}/${file}`;
      log(`Compiling ${relPath}...`);
      const { compiled, toc } = await compileMDXFile(content, filePath);

      // Write compiled output
      const compiledOutPath = path.join(
        BUILD_DIR,
        "compiled",
        entityType,
        entitySlug,
        locale,
        `${articleSlug}.mjs`
      );
      await writeText(compiledOutPath, compiled);

      // Write ToC
      const tocOutPath = path.join(
        BUILD_DIR,
        "toc",
        entityType,
        entitySlug,
        locale,
        `${articleSlug}.json`
      );
      await writeJson(tocOutPath, toc);
    }
  }

  return { articles };
}

async function processSystemArticles(
  system: LoadedSystem
): Promise<
  Record<
    string,
    {
      config: z.infer<typeof SystemArticleEntry>;
      locales: Locale[];
      compiledPath: string;
      tocPath: string;
    }
  >
> {
  const results: Record<string, any> = {};

  for (const articleConfig of system.config.articles) {
    results[articleConfig.slug] = {
      config: articleConfig,
      locales: [],
      compiledPath: `compiled/system/{locale}/${articleConfig.slug}.mjs`,
      tocPath: `toc/system/{locale}/${articleConfig.slug}.json`,
    };

    for (const locale of LOCALES) {
      const filePath = path.join(
        system.dir,
        "articles",
        locale,
        `${articleConfig.slug}.mdx`
      );
      if (!existsSync(filePath)) continue;

      const raw = await readFile(filePath, "utf-8");
      const { content } = matter(raw);

      results[articleConfig.slug].locales.push(locale);

      const relPath = `system/articles/${locale}/${articleConfig.slug}.mdx`;
      log(`Compiling ${relPath}...`);
      const { compiled, toc } = await compileMDXFile(content, filePath);

      const compiledOutPath = path.join(
        BUILD_DIR,
        "compiled",
        "system",
        locale,
        `${articleConfig.slug}.mjs`
      );
      await writeText(compiledOutPath, compiled);

      const tocOutPath = path.join(
        BUILD_DIR,
        "toc",
        "system",
        locale,
        `${articleConfig.slug}.json`
      );
      await writeJson(tocOutPath, toc);
    }
  }

  return results;
}

// ── Step 4: Generate Search Index ──────────────────────

function generateSearchIndexes(
  subjects: LoadedSubject[],
  teachers: LoadedTeacher[],
  system: LoadedSystem | null,
  subjectArticles: Record<string, Record<string, any>>,
  teacherArticles: Record<string, Record<string, any>>
): Record<string, SearchEntry[]> {
  const indexes: Record<string, SearchEntry[]> = {};

  for (const locale of LOCALES) {
    const entries: SearchEntry[] = [];

    // Subject entries
    for (const s of subjects) {
      entries.push({
        id: `subject:${s.config.slug}`,
        type: "subject",
        slug: s.config.slug,
        title: s.config.name[locale],
        description: s.config.description[locale],
        keywords: s.config.keywords[locale],
        route: `/${s.config.slug}`,
        extra: {
          difficulty: s.config.metadata?.difficulty,
          semester: s.config.metadata?.semester,
        },
      });

      // Subject articles
      const articles = subjectArticles[s.config.slug] || {};
      for (const [slug, article] of Object.entries(articles)) {
        if (slug === "_front") continue;
        entries.push({
          id: `subject-article:${s.config.slug}/${slug}`,
          type: "subject-article",
          slug,
          parentSlug: s.config.slug,
          title: article.frontmatter.title[locale],
          description: `${s.config.name[locale]} — ${article.frontmatter.title[locale]}`,
          keywords: article.frontmatter.keywords[locale],
          route: `/${s.config.slug}/${slug}`,
          extra: { difficulty: article.frontmatter.difficulty },
        });
      }
    }

    // Teacher entries
    for (const t of teachers) {
      entries.push({
        id: `teacher:${t.config.slug}`,
        type: "teacher",
        slug: t.config.slug,
        title: t.config.name[locale],
        description: t.config.description[locale],
        keywords: t.config.keywords[locale],
        route: `/${t.config.slug}`,
        extra: { teacherRating: t.config.ratings.overall },
      });

      // Teacher articles
      const articles = teacherArticles[t.config.slug] || {};
      for (const [slug, article] of Object.entries(articles)) {
        if (slug === "_front") continue;
        entries.push({
          id: `teacher-article:${t.config.slug}/${slug}`,
          type: "teacher-article",
          slug,
          parentSlug: t.config.slug,
          title: article.frontmatter.title[locale],
          description: `${t.config.name[locale]} — ${article.frontmatter.title[locale]}`,
          keywords: article.frontmatter.keywords[locale],
          route: `/${t.config.slug}/${slug}`,
        });
      }
    }

    // System articles
    if (system) {
      for (const a of system.config.articles) {
        entries.push({
          id: `system:${a.slug}`,
          type: "system-article",
          slug: a.slug,
          title: a.name[locale],
          description: a.description?.[locale] || "",
          keywords: a.keywords[locale],
          route: a.route,
        });
      }
    }

    indexes[locale] = entries;
  }

  return indexes;
}

// ── Step 5: Generate Manifest ──────────────────────────

function buildManifest(
  subjects: LoadedSubject[],
  teachers: LoadedTeacher[],
  system: LoadedSystem | null,
  subjectArticleData: Record<string, Record<string, any>>,
  teacherArticleData: Record<string, Record<string, any>>,
  systemArticleData: Record<string, any>,
  slugRegistry: Map<string, { type: string; source: string }>
): any {
  // Route map
  const routeMap: Record<string, { type: string }> = {};
  for (const [slug, info] of slugRegistry) {
    const typeMap: Record<string, string> = {
      Subject: "subject",
      Teacher: "teacher",
      "System Article": "system-article",
    };
    routeMap[slug] = { type: typeMap[info.type] || info.type };
  }

  // Build teacher lookup for resolving
  const teacherMap = new Map(
    teachers.map((t) => [t.config.slug, t.config])
  );
  const subjectMap = new Map(
    subjects.map((s) => [s.config.slug, s.config])
  );

  // Subjects manifest
  const subjectsManifest: Record<string, any> = {};
  for (const s of subjects) {
    const resolvedTeachers = s.config.teachers
      .map((tSlug) => {
        const t = teacherMap.get(tSlug);
        if (!t) {
          console.warn(
            `Warning: Subject "${s.config.slug}" references unknown teacher "${tSlug}"`
          );
          return null;
        }
        return {
          slug: t.slug,
          name: t.name,
          ratings: t.ratings,
          photo: t.photo,
        };
      })
      .filter(Boolean);

    // Assign categories to articles
    const articles = { ...(subjectArticleData[s.config.slug] || {}) };
    for (const cat of s.config.categories) {
      for (const articleSlug of cat.articles) {
        if (articles[articleSlug]) {
          articles[articleSlug] = {
            ...articles[articleSlug],
            category: cat.slug,
          };
        }
      }
    }

    subjectsManifest[s.config.slug] = {
      config: s.config,
      entityType: "subject",
      resolvedTeachers,
      articles,
    };
  }

  // Teachers manifest
  const teachersManifest: Record<string, any> = {};
  for (const t of teachers) {
    const resolvedSubjects = t.config.subjects
      .map((sSlug) => {
        const s = subjectMap.get(sSlug);
        if (!s) {
          console.warn(
            `Warning: Teacher "${t.config.slug}" references unknown subject "${sSlug}"`
          );
          return null;
        }
        return { slug: s.slug, name: s.name };
      })
      .filter(Boolean);

    // Assign sections to articles
    const articles = { ...(teacherArticleData[t.config.slug] || {}) };
    if (t.config.sections) {
      for (const sec of t.config.sections) {
        for (const articleSlug of sec.articles) {
          if (articles[articleSlug]) {
            articles[articleSlug] = {
              ...articles[articleSlug],
              section: sec.slug,
            };
          }
        }
      }
    }

    teachersManifest[t.config.slug] = {
      config: t.config,
      entityType: "teacher",
      resolvedSubjects,
      articles,
    };
  }

  // Compute build hash
  const hashContent = JSON.stringify({
    subjects: subjectsManifest,
    teachers: teachersManifest,
    systemArticles: systemArticleData,
  });
  const buildHash = createHash("sha256")
    .update(hashContent)
    .digest("hex")
    .slice(0, 12);

  return {
    buildHash,
    buildTime: new Date().toISOString(),
    locales: [...LOCALES],
    routeMap,
    subjects: subjectsManifest,
    teachers: teachersManifest,
    systemArticles: systemArticleData,
  };
}

// ── Main ───────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   WIKIPEFIA CONTENT BUILD PIPELINE   ║");
  console.log("╚══════════════════════════════════════╝");

  // Clean build directory
  logSection("Cleaning .content-build/");
  if (existsSync(BUILD_DIR)) {
    await rm(BUILD_DIR, { recursive: true });
  }
  await ensureDir(BUILD_DIR);
  log("Done.");

  // Step 1: Load configs
  logSection("Loading content configs...");
  const subjects = await loadSubjects();
  log(`Loaded ${subjects.length} subject(s): ${subjects.map((s) => s.config.slug).join(", ") || "(none)"}`);
  for (const s of subjects) {
    const catArticles = s.config.categories.flatMap((c) => c.articles);
    log(`  ↳ ${s.config.slug}: ${catArticles.length} article(s) in ${s.config.categories.length} category(ies) [dir: ${s.dir}]`);
  }
  const teachers = await loadTeachers();
  log(`Loaded ${teachers.length} teacher(s): ${teachers.map((t) => t.config.slug).join(", ") || "(none)"}`);
  for (const t of teachers) {
    const secArticles = (t.config.sections || []).flatMap((s) => s.articles);
    log(`  ↳ ${t.config.slug}: ${secArticles.length} article(s) in ${(t.config.sections || []).length} section(s) [dir: ${t.dir}]`);
  }
  const system = await loadSystem();
  if (system) {
    log(`Loaded ${system.config.articles.length} system article(s): ${system.config.articles.map((a) => a.slug).join(", ")}`);
  }

  // Step 2: Validate routes
  logSection("Validating routes (flat namespace)...");
  const slugRegistry = validateRoutes(subjects, teachers, system);

  // Step 3: Compile MDX
  logSection("Compiling MDX articles...");

  const subjectArticleData: Record<string, Record<string, any>> = {};
  for (const s of subjects) {
    const articlesDir = path.join(s.dir, "articles");
    const { articles } = await processArticles(
      articlesDir,
      s.config.slug,
      "subjects"
    );
    subjectArticleData[s.config.slug] = articles;
    const articleCount = Object.keys(articles).length;
    log(`Subject "${s.config.slug}": ${articleCount} article(s) compiled.`);
  }

  const teacherArticleData: Record<string, Record<string, any>> = {};
  for (const t of teachers) {
    const articlesDir = path.join(t.dir, "articles");
    const { articles } = await processArticles(
      articlesDir,
      t.config.slug,
      "teachers"
    );
    teacherArticleData[t.config.slug] = articles;
    const articleCount = Object.keys(articles).length;
    log(`Teacher "${t.config.slug}": ${articleCount} article(s) compiled.`);
  }

  let systemArticleData: Record<string, any> = {};
  if (system) {
    systemArticleData = await processSystemArticles(system);
    log(`System: ${Object.keys(systemArticleData).length} article(s) compiled.`);
  }

  // Step 4: Generate search indexes
  logSection("Generating search indexes...");
  const searchIndexes = generateSearchIndexes(
    subjects,
    teachers,
    system,
    subjectArticleData,
    teacherArticleData
  );

  const searchHash = createHash("sha256")
    .update(JSON.stringify(searchIndexes))
    .digest("hex")
    .slice(0, 12);

  for (const locale of LOCALES) {
    const indexPath = path.join(
      BUILD_DIR,
      `search-index-${locale}.json`
    );
    await writeJson(indexPath, searchIndexes[locale]);
    log(
      `${locale}: ${searchIndexes[locale].length} entries → search-index-${locale}.json`
    );
  }

  // Search meta
  await writeJson(path.join(BUILD_DIR, "search-meta.json"), {
    hash: searchHash,
    generatedAt: new Date().toISOString(),
  });

  // Step 5: Generate manifest
  logSection("Generating manifest...");
  const manifest = buildManifest(
    subjects,
    teachers,
    system,
    subjectArticleData,
    teacherArticleData,
    systemArticleData,
    slugRegistry
  );
  await writeJson(path.join(BUILD_DIR, "manifest.json"), manifest);
  log(`Manifest written. Build hash: ${manifest.buildHash}`);

  // Also write route-map.json for quick lookups
  await writeJson(
    path.join(BUILD_DIR, "route-map.json"),
    manifest.routeMap
  );
  log("Route map written.");

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✓ Build complete in ${elapsed}s`);
  console.log(
    `  ${subjects.length} subjects, ${teachers.length} teachers, ` +
      `${system?.config.articles.length || 0} system articles`
  );
  console.log(`  Build hash: ${manifest.buildHash}\n`);
}

main().catch((err) => {
  // If this is an MDX compilation error, the detailed box was already printed
  if (err.reason && err.line) {
    console.error(`✗ Build failed due to MDX compilation error (see above).`);
  } else {
    console.error("\n✗ Build failed:", err);
  }
  process.exit(1);
});
