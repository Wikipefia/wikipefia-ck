---
name: Wikipefia Technical Specification
overview: Comprehensive technical specification for Wikipefia -- an educational portal built on Next.js 16 with flat routing (no /subjects/ or /teachers/ prefixes), cookie-based i18n, pre-compiled MDX articles from GitHub repos, build-time data resolution, client-side search, and multi-language support. Teachers are full content entities with their own article repos. This document serves as the project's architectural blueprint.
todos:
  - id: stage-1-design
    content: "Stage 1: Create 5 distinct frontend design variants with all pages mocked (Home, Article, Subject, Teacher, Search)"
    status: pending
  - id: stage-2-schemas
    content: "Stage 2.1: Implement Zod schemas for Subject, Teacher, Article, SystemArticle entities"
    status: pending
  - id: stage-2-build-pipeline
    content: "Stage 2.1: Write build-content.ts (compile MDX, resolve relations, validate routes across unified namespace, generate search index + manifest)"
    status: pending
  - id: stage-2-content-pull
    content: "Stage 2.1: Write pull-content.ts for fetching content from GitHub repos"
    status: pending
  - id: stage-2-mdx
    content: "Stage 2.2: Set up @mdx-js/mdx compilation + rendering pipeline with shared article infrastructure for subjects and teachers"
    status: pending
  - id: stage-2-search
    content: "Stage 2.3: Implement client-side search with FlexSearch, IndexedDB caching, and SearchDialog"
    status: pending
  - id: stage-2-i18n
    content: "Stage 2.4: Configure next-intl with cookie-based locale (no URL prefix), translation files, locale-aware content loading"
    status: pending
  - id: stage-2-integration
    content: "Stage 2.5: Replace mocks with real pipeline, wire generateStaticParams, end-to-end verification"
    status: pending
  - id: stage-3-cicd
    content: "Stage 3.1: Set up GitHub Actions workflows for main repo and content repo webhooks"
    status: pending
  - id: stage-3-testing
    content: "Stage 3.2: Add Vitest unit tests, Playwright E2E, Lighthouse CI"
    status: pending
  - id: stage-3-polish
    content: "Stage 3.3: SEO, error pages, loading states, performance optimization"
    status: pending
  - id: stage-3-fundamentals
    content: "Stage 3.4: Write 'Fundamentals of Wikipefia' -- maintainer prompts, content authoring instructions, article structure templates, contribution guidelines"
    status: pending
isProject: false
---

# Wikipefia -- Technical Specification

---

## 1. Project Overview

Wikipefia is a statically-generated educational portal for university students. Students can browse subjects, read academic articles written in MDX (with embedded React components), evaluate teachers, and search across all content. There is **no runtime database** -- all data lives in JSON configs and MDX files pulled from GitHub repositories and fully resolved at build time.

**Core principles:**

- Performance above everything: all pages are SSG, all MDX is pre-compiled, search index lives on the client
- Zero runtime dependencies on external services (no DB, no CMS, no API)
- Content is portable: each subject and each teacher is a self-contained GitHub repo
- Flat routing: no `/subjects/` or `/teachers/` prefixes -- every entity owns a top-level slug
- Build time and artifact size are irrelevant -- optimize exclusively for end-user speed

---

## 2. Tech Stack

| Layer           | Technology                              | Reason                                             |
| --------------- | --------------------------------------- | -------------------------------------------------- |
| Framework       | **Next.js 16** (App Router, RSC)        | SSG + Server Components for zero-JS article pages  |
| Runtime         | **React 19**                            | Streaming, RSC, concurrent features                |
| Language        | **TypeScript 5**                        | Type safety across configs, schemas, build scripts |
| Styling         | **Tailwind CSS 4**                      | Utility-first, tree-shakes unused CSS              |
| Animations      | **Motion** (ex framer-motion)           | Production-grade React animations                  |
| MDX             | **@mdx-js/mdx** + remark/rehype plugins | Direct control over compilation pipeline           |
| Search          | **FlexSearch** (client-side)            | Fastest JS full-text search, ~6KB gzipped          |
| i18n            | **next-intl**                           | Native App Router support, RSC-compatible          |
| Validation      | **Zod**                                 | Runtime schema validation for configs              |
| Testing         | **Vitest** + **Playwright**             | Unit + E2E                                         |
| Package Manager | **pnpm**                                | Already configured in the repo                     |

### Key Dependencies to Install

```
# Core
@mdx-js/mdx gray-matter next-intl zod flexsearch motion

# MDX plugins
remark-gfm remark-math rehype-slug rehype-autolink-headings rehype-katex rehype-pretty-code

# Build tools
tsx glob fast-glob chalk

# Dev/Test
vitest @playwright/test
```

---

## 3. Routing Philosophy

**All entities share a single flat URL namespace.** There are no `/subjects/` or `/teachers/` path prefixes. Every entity (subject, teacher, system article) owns a top-level slug. Language is stored in a cookie, not in the URL.

### 3.1 URL Structure

```
/                                     → Home page
/linear-algebra                       → Subject front page (slug = "linear-algebra")
/linear-algebra/vectors-intro         → Subject article
/ivan-petrov                          → Teacher front page (slug = "ivan-petrov")
/ivan-petrov/teaching-philosophy      → Teacher article
/semester-1-overview                  → System article (slug = "semester-1-overview")
```

Language is resolved from:

1. `NEXT_LOCALE` cookie (set by locale switcher)
2. `Accept-Language` header (first visit)
3. Default: `ru`

No locale in the URL means cleaner, shorter, more shareable links.

### 3.2 How Flat Routing Works in Next.js App Router

Since subjects, teachers, and system articles all live at `/<slug>`, we use a **single catch-all route** that resolves the entity type at render time using the manifest:

```
app/
├── layout.tsx                            # Root layout (providers, nav, footer)
├── page.tsx                              # HOME PAGE
├── [entitySlug]/
│   ├── page.tsx                          # RESOLVER: subject front OR teacher front OR system article
│   └── [articleSlug]/
│       └── page.tsx                      # RESOLVER: subject article OR teacher article
└── not-found.tsx
```

The `[entitySlug]/page.tsx` component reads the manifest, determines the entity type, and delegates to the appropriate renderer:

```typescript
// app/[entitySlug]/page.tsx
export default async function EntityPage({ params }) {
  const { entitySlug } = await params;
  const manifest = await getManifest();
  const locale = await getLocale(); // from cookie via next-intl

  // Check entity type (order matters for priority)
  if (manifest.subjects[entitySlug]) {
    return (
      <SubjectFrontPage
        subject={manifest.subjects[entitySlug]}
        locale={locale}
      />
    );
  }
  if (manifest.teachers[entitySlug]) {
    return (
      <TeacherFrontPage
        teacher={manifest.teachers[entitySlug]}
        locale={locale}
      />
    );
  }
  if (manifest.systemArticles[entitySlug]) {
    return (
      <SystemArticlePage
        article={manifest.systemArticles[entitySlug]}
        locale={locale}
      />
    );
  }

  notFound();
}
```

### 3.3 Route Namespace Collision Prevention

Because everything shares one namespace, the build MUST enforce **global slug uniqueness**. A slug collision means a broken site. The route validator collects ALL slugs from ALL entity types into one set:

```
Namespace = {
  all subject slugs,
  all teacher slugs,
  all system article slugs,
  reserved: ["api", "_next", "not-found", "search"]
}
```

Any duplicate = build failure with a detailed, actionable error message.

---

## 4. Repository Structure

```
wikipefia/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout (providers, nav, footer, locale)
│   ├── page.tsx                      # HOME PAGE (hero + search + featured)
│   ├── [entitySlug]/
│   │   ├── page.tsx                  # Entity resolver (subject/teacher/system)
│   │   └── [articleSlug]/
│   │       └── page.tsx              # Article resolver (subject or teacher article)
│   └── not-found.tsx
│
├── content/                          # Raw content (pulled from GitHub repos)
│   ├── subjects/
│   │   └── <subject-slug>/
│   │       ├── config.json           # Subject metadata, teachers, categories
│   │       └── articles/
│   │           ├── ru/
│   │           │   ├── _front.mdx    # Front-article (required)
│   │           │   ├── vectors.mdx
│   │           │   └── matrices.mdx
│   │           ├── en/
│   │           └── cz/
│   ├── teachers/
│   │   └── <teacher-slug>/           # Each teacher is its own folder (own repo)
│   │       ├── config.json           # Teacher metadata, ratings, reviews
│   │       └── articles/
│   │           ├── ru/
│   │           │   ├── _front.mdx    # Teacher front page (profile, required)
│   │           │   └── teaching-tips.mdx  # Optional teacher articles
│   │           ├── en/
│   │           └── cz/
│   ├── system/
│   │   ├── config.json               # System articles registry
│   │   └── articles/
│   │       ├── ru/
│   │       │   └── semester-1.mdx
│   │       ├── en/
│   │       └── cz/
│
├── .content-build/                   # BUILD OUTPUT (gitignored, regenerated)
│   ├── manifest.json                 # Full content graph with resolved relations
│   ├── route-map.json                # slug -> entity type mapping for fast lookup
│   ├── search-index-ru.json          # Per-locale search index for client
│   ├── search-index-en.json
│   ├── search-index-cz.json
│   ├── toc/                          # Extracted table-of-contents per article
│   │   ├── subjects/<slug>/<locale>/<article>.json
│   │   └── teachers/<slug>/<locale>/<article>.json
│   └── compiled/                     # Pre-compiled MDX (JS function bodies)
│       ├── subjects/<slug>/<locale>/<article>.mjs
│       ├── teachers/<slug>/<locale>/<article>.mjs
│       └── system/<locale>/<article>.mjs
│
├── lib/
│   ├── content/                      # Content pipeline utilities
│   │   ├── compiler.ts               # MDX -> JS compilation
│   │   ├── loader.ts                 # Read compiled content from .content-build
│   │   ├── resolver.ts               # Cross-entity relationship resolution
│   │   ├── route-map.ts              # Slug -> entity type resolution
│   │   ├── validator.ts              # Schema + route validation
│   │   └── search-indexer.ts         # Search index generation
│   ├── schemas/                      # Zod schemas for all entities
│   │   ├── shared.ts                 # LocalizedString, LocalizedKeywords, etc.
│   │   ├── subject.ts
│   │   ├── teacher.ts
│   │   ├── article.ts                # Shared article frontmatter schema
│   │   └── system-article.ts
│   ├── i18n/
│   │   ├── config.ts                 # Locale list, default, fallback chain
│   │   ├── request.ts                # next-intl request config (cookie-based)
│   │   └── messages/
│   │       ├── ru.json
│   │       ├── en.json
│   │       └── cz.json
│   └── mdx/
│       ├── components.tsx            # Custom MDX component map
│       └── renderer.tsx              # Server-side MDX render utility
│
├── components/
│   ├── search/
│   │   ├── search-dialog.tsx         # Search overlay (cmd+k)
│   │   ├── search-provider.tsx       # Context + FlexSearch init + caching
│   │   └── use-search.ts            # Hook for search queries
│   ├── entity/                       # SHARED article infrastructure
│   │   ├── article-layout.tsx        # Article page shell (used by subjects AND teachers)
│   │   ├── table-of-contents.tsx     # Sticky ToC with scroll tracking
│   │   └── article-meta.tsx          # Author, date, difficulty sidebar
│   ├── front-pages/                  # Entity-specific front page layouts
│   │   ├── subject-front.tsx         # Subject front: categories, article grid, metadata
│   │   └── teacher-front.tsx         # Teacher front: profile, ratings, reviews, subjects
│   ├── navigation/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── locale-switcher.tsx       # Sets NEXT_LOCALE cookie
│   │   └── breadcrumbs.tsx
│   └── ui/                           # Shared primitives
│
├── scripts/
│   ├── build-content.ts              # MAIN: orchestrates full content build
│   ├── pull-content.ts               # Fetches content from GitHub repos
│   └── validate-routes.ts            # Global slug uniqueness checker
│
├── content-sources.json              # GitHub repo -> content directory mapping
├── middleware.ts                      # next-intl cookie-based locale detection
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 5. Entity Schemas (Zod + JSON)

### 5.1 Localized String Type

Every user-facing string is a localized object:

```typescript
// lib/schemas/shared.ts
import { z } from "zod";

export const locales = ["ru", "en", "cz"] as const;
export type Locale = (typeof locales)[number];

export const LocalizedString = z.object({
  ru: z.string(),
  en: z.string(),
  cz: z.string(),
});

export const LocalizedKeywords = z.object({
  ru: z.array(z.string()),
  en: z.array(z.string()),
  cz: z.array(z.string()),
});
```

### 5.2 Subject (`content/subjects/<slug>/config.json`)

```typescript
// lib/schemas/subject.ts
export const SubjectConfig = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: LocalizedString,
  description: LocalizedString,
  teachers: z.array(z.string()), // teacher slugs (refs)
  keywords: LocalizedKeywords,
  categories: z.array(
    z.object({
      slug: z.string(),
      name: LocalizedString,
      articles: z.array(z.string()), // article slugs within this category
    })
  ),
  metadata: z
    .object({
      semester: z.number().optional(),
      credits: z.number().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      department: LocalizedString.optional(),
    })
    .optional(),
});
```

Example JSON:

```json
{
  "slug": "linear-algebra",
  "name": {
    "ru": "Линейная алгебра",
    "en": "Linear Algebra",
    "cz": "Lineární algebra"
  },
  "description": {
    "ru": "Основы линейной алгебры...",
    "en": "Fundamentals of linear algebra...",
    "cz": "Základy lineární algebry..."
  },
  "teachers": ["ivan-petrov", "maria-novakova"],
  "keywords": {
    "ru": ["линейная алгебра", "матрицы", "вектора", "определитель"],
    "en": ["linear algebra", "matrices", "vectors", "determinant"],
    "cz": ["lineární algebra", "matice", "vektory", "determinant"]
  },
  "categories": [
    {
      "slug": "fundamentals",
      "name": { "ru": "Основы", "en": "Fundamentals", "cz": "Základy" },
      "articles": ["vectors-intro", "matrix-operations"]
    },
    {
      "slug": "advanced",
      "name": { "ru": "Продвинутые", "en": "Advanced", "cz": "Pokročilé" },
      "articles": ["eigenvalues", "svd-decomposition"]
    }
  ],
  "metadata": {
    "semester": 1,
    "credits": 5,
    "difficulty": "medium"
  }
}
```

### 5.3 Teacher (`content/teachers/<slug>/config.json`)

Teachers are **full content entities** -- like subjects, they have their own repo, their own config, their own `_front.mdx`, and can contain multiple articles. The key difference is the front page layout (profile/ratings/reviews vs course overview/categories).

```typescript
// lib/schemas/teacher.ts
export const TeacherConfig = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: LocalizedString,
  description: LocalizedString,
  photo: z.string().optional(), // path relative to content/teachers/<slug>/
  subjects: z.array(z.string()), // subject slugs (refs)
  ratings: z.object({
    overall: z.number().min(0).max(5),
    clarity: z.number().min(0).max(5),
    difficulty: z.number().min(0).max(5),
    usefulness: z.number().min(0).max(5),
    count: z.number().int().min(0),
  }),
  keywords: LocalizedKeywords,
  contacts: z
    .object({
      email: z.string().email().optional(),
      office: LocalizedString.optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  reviews: z
    .array(
      z.object({
        text: LocalizedString,
        rating: z.number().min(1).max(5),
        date: z.string(), // ISO date
        anonymous: z.boolean().default(true),
      })
    )
    .optional(),
  // Optional: organize teacher's articles into sections (like subject categories)
  sections: z
    .array(
      z.object({
        slug: z.string(),
        name: LocalizedString,
        articles: z.array(z.string()),
      })
    )
    .optional(),
});
```

Example teacher content structure (its own GitHub repo):

```
teacher-ivan-petrov/
├── config.json
├── articles/
│   ├── ru/
│   │   ├── _front.mdx                # Required: teacher profile page content
│   │   ├── teaching-philosophy.mdx   # Optional articles by/about this teacher
│   │   └── exam-tips.mdx
│   ├── en/
│   │   ├── _front.mdx
│   │   └── teaching-philosophy.mdx
│   └── cz/
│       └── _front.mdx
├── assets/
│   └── photo.jpg
└── .github/
    └── workflows/
        └── notify-main.yml
```

Example `config.json`:

```json
{
  "slug": "ivan-petrov",
  "name": {
    "ru": "Иван Петров",
    "en": "Ivan Petrov",
    "cz": "Ivan Petrov"
  },
  "description": {
    "ru": "Профессор математики, 15 лет опыта...",
    "en": "Professor of mathematics, 15 years of experience...",
    "cz": "Profesor matematiky, 15 let zkušeností..."
  },
  "photo": "assets/photo.jpg",
  "subjects": ["linear-algebra", "calculus"],
  "ratings": {
    "overall": 4.5,
    "clarity": 4.8,
    "difficulty": 3.2,
    "usefulness": 4.6,
    "count": 127
  },
  "keywords": {
    "ru": ["петров", "математика", "линейная алгебра"],
    "en": ["petrov", "mathematics", "linear algebra"],
    "cz": ["petrov", "matematika", "lineární algebra"]
  },
  "contacts": {
    "email": "petrov@university.edu",
    "office": {
      "ru": "Корпус А, к. 305",
      "en": "Building A, Room 305",
      "cz": "Budova A, č. 305"
    }
  },
  "reviews": [
    {
      "text": {
        "ru": "Отлично объясняет...",
        "en": "Explains very well...",
        "cz": "Skvěle vysvětluje..."
      },
      "rating": 5,
      "date": "2025-06-15",
      "anonymous": true
    }
  ],
  "sections": [
    {
      "slug": "guides",
      "name": { "ru": "Гайды", "en": "Guides", "cz": "Průvodce" },
      "articles": ["teaching-philosophy", "exam-tips"]
    }
  ]
}
```

### 5.4 Article Frontmatter (in MDX files, shared by subjects AND teachers)

```typescript
// lib/schemas/article.ts
export const ArticleFrontmatter = z.object({
  title: LocalizedString,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  author: z.string().optional(), // teacher slug
  keywords: LocalizedKeywords,
  created: z.string(), // ISO date
  updated: z.string().optional(), // ISO date
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimatedReadTime: z.number().optional(), // minutes
  prerequisites: z.array(z.string()).optional(), // other article slugs
  tutors: z.array(z.string()).optional(), // teacher slugs who can tutor this
});
```

Example frontmatter in `_front.mdx`:

```yaml
---
title:
  ru: "Линейная алгебра: Обзор"
  en: "Linear Algebra: Overview"
  cz: "Lineární algebra: Přehled"
slug: "_front"
author: "ivan-petrov"
keywords:
  ru: ["обзор", "введение"]
  en: ["overview", "introduction"]
  cz: ["přehled", "úvod"]
created: "2024-09-01"
updated: "2025-01-15"
---
```

### 5.5 System Article (`content/system/config.json`)

```typescript
// lib/schemas/system-article.ts
export const SystemArticleEntry = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  route: z.string().startsWith("/"), // explicit route from root
  name: LocalizedString,
  description: LocalizedString.optional(),
  keywords: LocalizedKeywords,
  pinned: z.boolean().default(false), // show on home page
  order: z.number().optional(), // sort priority
});

export const SystemConfig = z.object({
  articles: z.array(SystemArticleEntry),
});
```

Example:

```json
{
  "articles": [
    {
      "slug": "semester-1-overview",
      "route": "/semester-1-overview",
      "name": {
        "ru": "Обзор первого семестра",
        "en": "First Semester Overview",
        "cz": "Přehled prvního semestru"
      },
      "keywords": {
        "ru": ["первый семестр", "обзор", "предметы"],
        "en": ["first semester", "overview", "subjects"],
        "cz": ["první semestr", "přehled", "předměty"]
      },
      "pinned": true,
      "order": 1
    }
  ]
}
```

---

## 6. Build Pipeline

The full build is a three-phase sequential pipeline:

```
pnpm build = content:pull --> content:compile --> next build
```

Defined in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "pnpm content:pull && pnpm content:compile && next build",
    "build:local": "pnpm content:compile && next build",
    "content:pull": "tsx scripts/pull-content.ts",
    "content:compile": "tsx scripts/build-content.ts",
    "content:validate": "tsx scripts/validate-routes.ts",
    "start": "next start",
    "lint": "eslint"
  }
}
```

### 5.1 Phase 1: Content Pull (`scripts/pull-content.ts`)

Reads `content-sources.json` and fetches content from GitHub repositories.

`**content-sources.json` format:

```json
{
  "subjects": [
    {
      "repo": "org/subject-linear-algebra",
      "branch": "main",
      "path": ".",
      "targetDir": "content/subjects/linear-algebra"
    },
    {
      "repo": "org/subject-calculus",
      "branch": "main",
      "path": ".",
      "targetDir": "content/subjects/calculus"
    }
  ],
  "teachers": [
    {
      "repo": "org/teacher-ivan-petrov",
      "branch": "main",
      "path": ".",
      "targetDir": "content/teachers/ivan-petrov"
    },
    {
      "repo": "org/teacher-maria-novakova",
      "branch": "main",
      "path": ".",
      "targetDir": "content/teachers/maria-novakova"
    }
  ],
  "system": {
    "repo": "org/system-articles",
    "branch": "main",
    "path": ".",
    "targetDir": "content/system"
  }
}
```

**Pull algorithm:**

```
1. Read content-sources.json
2. For each source:
   a. If in CI (GITHUB_ACTIONS=true):
      - Use `actions/checkout` (already done in workflow) or
      - Use GitHub API: GET /repos/{owner}/{repo}/tarball/{ref}
      - Extract to targetDir
   b. If local:
      - git clone --depth 1 --branch {branch} {repo} /tmp/{slug}
      - Copy relevant files to targetDir
      - Clean up /tmp/{slug}
3. Verify each targetDir has expected structure:
   - Subject dirs: config.json + articles/ with at least one locale containing _front.mdx
   - Teacher dirs: config.json + articles/ with at least one locale containing _front.mdx
   - System dir: config.json + articles/ directory
4. On verification failure: print detailed error and exit 1
```

### 5.2 Phase 2: Content Compile (`scripts/build-content.ts`)

This is the **core of the build system**. It transforms raw content into optimized, pre-compiled artifacts.

```
┌─────────────────────────────────────────────────────────────────┐
│                    build-content.ts                              │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │ 1. Load  │──>│ 2. Validate  │──>│ 3. Resolve Relations   │  │
│  │ Configs  │   │ Schemas      │   │ (denormalize)          │  │
│  └──────────┘   └──────────────┘   └────────────────────────┘  │
│       │                                       │                 │
│       v                                       v                 │
│  ┌──────────────┐   ┌────────────────┐  ┌──────────────────┐   │
│  │ 4. Validate  │   │ 5. Compile     │  │ 6. Extract       │   │
│  │ Routes       │   │ MDX -> JS      │  │ ToC / Headings   │   │
│  └──────────────┘   └────────────────┘  └──────────────────┘   │
│                            │                    │               │
│                            v                    v               │
│                     ┌────────────────┐  ┌──────────────────┐   │
│                     │ 7. Generate    │  │ 8. Generate      │   │
│                     │ Search Index   │  │ Manifest         │   │
│                     └────────────────┘  └──────────────────┘   │
│                            │                    │               │
│                            v                    v               │
│                     ┌────────────────────────────────────────┐  │
│                     │       .content-build/ output           │  │
│                     └────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Step 1: Load Configs**

- Read all `config.json` files from `content/subjects/*/`, `content/teachers/*/`, `content/system/`
- Parse JSON
- Collect all MDX file paths per locale for all three entity types

**Step 2: Schema Validation**

- Validate each config against its Zod schema
- Validate every MDX file's frontmatter against `ArticleFrontmatter` schema
- On failure, report:
  ```
  VALIDATION ERROR in content/subjects/linear-algebra/config.json:
    - Field "teachers[1]": Expected string, received number
    - Field "categories[0].articles": Array must contain at least 1 element
  ```

**Step 3: Relationship Resolution**

Build a complete, denormalized content graph. Subjects and teachers are structurally similar (both have configs + articles), so they share the `resolvedArticles` shape:

```typescript
// Shared article resolution shape (used by both subjects and teachers)
interface ResolvedArticle {
  slug: string;
  frontmatter: ArticleFrontmatter;
  locales: Locale[];
  category?: string; // which category/section it belongs to
  compiledPath: string; // template: "compiled/subjects/<slug>/{locale}/<article>.mjs"
  tocPath: string;
}

interface ResolvedSubject {
  // ... all SubjectConfig fields ...
  entityType: "subject";
  resolvedTeachers: Array<{
    slug: string;
    name: LocalizedString;
    ratings: TeacherRatings;
    photo?: string;
  }>;
  resolvedArticles: ResolvedArticle[];
}

interface ResolvedTeacher {
  // ... all TeacherConfig fields ...
  entityType: "teacher";
  resolvedSubjects: Array<{
    slug: string;
    name: LocalizedString;
  }>;
  resolvedArticles: ResolvedArticle[]; // teachers have articles too!
}
```

Cross-reference validation:

- Every teacher slug referenced in a subject config MUST exist as a teacher directory
- Every subject slug referenced in a teacher config MUST exist as a subject directory
- Every article slug referenced in subject categories MUST have a corresponding MDX file
- Every article slug referenced in teacher sections MUST have a corresponding MDX file
- Bidirectional consistency: if subject X lists teacher Y, teacher Y SHOULD list subject X (warning, not error)

**Step 4: Route Validation (CRITICAL for flat namespace)**

With flat routing, ALL top-level slugs share one namespace. A collision between a subject, teacher, or system article slug is a fatal build error.

```typescript
const RESERVED_SLUGS = ["api", "_next", "not-found", "search"];

function validateRoutes(
  subjects: SubjectConfig[],
  teachers: TeacherConfig[],
  systemArticles: SystemArticleEntry[]
) {
  const errors: string[] = [];

  // Collect ALL top-level slugs with their source info
  const slugRegistry = new Map<string, { type: string; source: string }>();

  function registerSlug(slug: string, type: string, source: string) {
    // Check against reserved slugs
    if (RESERVED_SLUGS.includes(slug)) {
      errors.push(
        `RESERVED SLUG: ${type} "${slug}" uses a reserved slug.\n` +
          `  Source: ${source}\n` +
          `  Reserved slugs: ${RESERVED_SLUGS.join(", ")}\n` +
          `  Fix: Change the slug to something else.`
      );
      return;
    }

    // Check against already-registered slugs (collision detection)
    const existing = slugRegistry.get(slug);
    if (existing) {
      errors.push(
        `SLUG COLLISION: "${slug}" is claimed by both:\n` +
          `  1. ${existing.type} (${existing.source})\n` +
          `  2. ${type} (${source})\n` +
          `  All subjects, teachers, and system articles share one URL namespace.\n` +
          `  Fix: Rename one of them to use a different slug.`
      );
      return;
    }

    slugRegistry.set(slug, { type, source });
  }

  // Register all subject slugs
  for (const subject of subjects) {
    registerSlug(
      subject.slug,
      "Subject",
      `content/subjects/${subject.slug}/config.json`
    );
  }

  // Register all teacher slugs
  for (const teacher of teachers) {
    registerSlug(
      teacher.slug,
      "Teacher",
      `content/teachers/${teacher.slug}/config.json`
    );
  }

  // Register all system article slugs
  for (const article of systemArticles) {
    registerSlug(article.slug, "System Article", `content/system/config.json`);
  }

  // Additionally: check for article slug collisions WITHIN each entity
  // (/<entity-slug>/<article-slug> must be unique per entity)
  for (const subject of subjects) {
    const articleSlugs = new Set<string>();
    for (const category of subject.categories) {
      for (const articleSlug of category.articles) {
        if (articleSlugs.has(articleSlug)) {
          errors.push(
            `ARTICLE DUPLICATE: Subject "${subject.slug}" lists article "${articleSlug}" ` +
              `in multiple categories.\n` +
              `  Source: content/subjects/${subject.slug}/config.json`
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

  console.log(
    `Route validation passed. ${slugRegistry.size} unique slugs registered.`
  );
}
```

The validator also produces a **route-map.json** for fast runtime lookups:

```json
{
  "linear-algebra": { "type": "subject" },
  "ivan-petrov": { "type": "teacher" },
  "semester-1-overview": { "type": "system-article" }
}
```

**Step 5: MDX Compilation**

For every MDX file across all locales:

```typescript
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";

async function compileMDXFile(source: string): Promise<string> {
  const vfile = await compile(source, {
    outputFormat: "function-body", // Outputs evaluatable JS function body
    development: false, // Production mode
    remarkPlugins: [
      remarkGfm, // GitHub Flavored Markdown (tables, etc.)
      remarkMath, // LaTeX math blocks
    ],
    rehypePlugins: [
      rehypeSlug, // Add IDs to headings
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
      rehypeKatex, // Render math to HTML
      [
        rehypePrettyCode,
        {
          // Syntax highlighting
          theme: "one-dark-pro",
          keepBackground: true,
        },
      ],
    ],
  });
  return String(vfile);
}
```

Output paths:

```
.content-build/compiled/subjects/<slug>/<locale>/<article>.mjs
.content-build/compiled/teachers/<slug>/<locale>/<article>.mjs
.content-build/compiled/system/<locale>/<article>.mjs
```

The compiled file contains a JS function body that, when evaluated with `run()`, produces a React component. This is the **most expensive step** and the reason we pre-compile -- so `next build` never touches raw MDX. Teachers and subjects use the exact same compilation pipeline.

**Step 6: Table of Contents Extraction**

During MDX compilation, a custom rehype plugin extracts heading structure:

```typescript
interface TocEntry {
  id: string; // heading HTML id (from rehype-slug)
  text: string; // heading text content
  depth: number; // 1-6
}

// Custom rehype plugin that runs during compilation
function rehypeExtractToc(tocStore: TocEntry[]) {
  return (tree: any) => {
    visit(tree, "element", (node) => {
      if (/^h[1-6]$/.test(node.tagName)) {
        tocStore.push({
          id: node.properties.id,
          text: toString(node),
          depth: parseInt(node.tagName[1]),
        });
      }
    });
  };
}
```

Output: `.content-build/toc/<subject>/<locale>/<article>.json`

**Step 7: Search Index Generation**

Per locale, creates a flat array of search entries:

```typescript
interface SearchEntry {
  id: string; // unique: "subject:linear-algebra" or "article:linear-algebra/vectors"
  type:
    | "subject"
    | "teacher"
    | "subject-article"
    | "teacher-article"
    | "system-article";
  slug: string;
  parentSlug?: string; // for articles: the parent entity slug
  title: string; // localized to this index's locale
  description: string; // brief, localized
  keywords: string[]; // localized keywords array
  route: string; // full route path: "/linear-algebra" or "/ivan-petrov/exam-tips"
  extra?: {
    difficulty?: string;
    semester?: number;
    teacherRating?: number;
  };
}
```

Output files include a content hash for cache busting:

```
.content-build/search-index-ru.json
.content-build/search-index-en.json
.content-build/search-index-cz.json
.content-build/search-meta.json    // { hash: "abc123", generatedAt: "..." }
```

During `next build`, these are copied to `public/` so they're served as static files:

```
public/search/index-ru-<hash>.json
public/search/index-en-<hash>.json
public/search/index-cz-<hash>.json
```

**Step 8: Manifest Generation**

The manifest is the single source of truth for all resolved content data:

```typescript
interface ContentManifest {
  buildHash: string; // SHA256 of all content
  buildTime: string; // ISO timestamp
  locales: Locale[];

  // Route map: slug -> entity type (for fast page-level resolution)
  routeMap: Record<string, { type: "subject" | "teacher" | "system-article" }>;

  subjects: Record<
    string,
    {
      config: SubjectConfig;
      entityType: "subject";
      resolvedTeachers: Array<{
        slug: string;
        name: LocalizedString;
        ratings: TeacherRatings;
        photo?: string;
      }>;
      articles: Record<
        string,
        {
          // keyed by article slug
          frontmatter: ArticleFrontmatter;
          locales: Locale[];
          compiledPath: string; // "compiled/subjects/<slug>/{locale}/<article>.mjs"
          tocPath: string;
          category?: string;
        }
      >;
    }
  >;

  teachers: Record<
    string,
    {
      config: TeacherConfig;
      entityType: "teacher";
      resolvedSubjects: Array<{ slug: string; name: LocalizedString }>;
      articles: Record<
        string,
        {
          // keyed by article slug (same shape as subject articles!)
          frontmatter: ArticleFrontmatter;
          locales: Locale[];
          compiledPath: string; // "compiled/teachers/<slug>/{locale}/<article>.mjs"
          tocPath: string;
          section?: string;
        }
      >;
    }
  >;

  systemArticles: Record<
    string,
    {
      config: SystemArticleEntry;
      locales: Locale[];
      compiledPath: string;
      tocPath: string;
    }
  >;
}
```

Note how `subjects[x].articles` and `teachers[x].articles` share the **exact same shape**. This is what enables shared rendering infrastructure.

Output: `.content-build/manifest.json`

### 6.3 Phase 3: Next.js Build

Standard `next build` leveraging pre-compiled content.

**Pre-build hook** (in `next.config.ts`): copies search index files to `public/search/`.

**Entity slug page (`app/[entitySlug]/page.tsx`) uses `generateStaticParams`:**

```typescript
export async function generateStaticParams() {
  const manifest = await getManifest();
  // Every entry in routeMap is a valid [entitySlug]
  return Object.keys(manifest.routeMap).map((slug) => ({ entitySlug: slug }));
}
```

**Article page (`app/[entitySlug]/[articleSlug]/page.tsx`) uses `generateStaticParams`:**

```typescript
export async function generateStaticParams() {
  const manifest = await getManifest();
  const params: Array<{ entitySlug: string; articleSlug: string }> = [];

  // Subject articles
  for (const [entitySlug, subject] of Object.entries(manifest.subjects)) {
    for (const articleSlug of Object.keys(subject.articles)) {
      if (articleSlug !== "_front") {
        params.push({ entitySlug, articleSlug });
      }
    }
  }

  // Teacher articles
  for (const [entitySlug, teacher] of Object.entries(manifest.teachers)) {
    for (const articleSlug of Object.keys(teacher.articles)) {
      if (articleSlug !== "_front") {
        params.push({ entitySlug, articleSlug });
      }
    }
  }

  return params;
}
```

This means **every** page is pre-rendered as static HTML at build time. Zero server-side computation at runtime. The locale is resolved from the cookie at request time (middleware), but content for all locales is pre-built.

---

## 7. MDX Rendering (Runtime)

### 7.1 Content Loader

```typescript
// lib/content/loader.ts
import { readFile } from "fs/promises";
import path from "path";

const BUILD_DIR = path.join(process.cwd(), ".content-build");
let cachedManifest: ContentManifest | null = null;

export async function getManifest(): Promise<ContentManifest> {
  if (cachedManifest) return cachedManifest;
  const raw = await readFile(path.join(BUILD_DIR, "manifest.json"), "utf-8");
  cachedManifest = JSON.parse(raw);
  return cachedManifest!;
}

export async function getCompiledMDX(compiledPath: string): Promise<string> {
  return readFile(path.join(BUILD_DIR, compiledPath), "utf-8");
}

export async function getTableOfContents(tocPath: string): Promise<TocEntry[]> {
  const raw = await readFile(path.join(BUILD_DIR, tocPath), "utf-8");
  return JSON.parse(raw);
}
```

### 7.2 MDX Renderer (Server Component)

```typescript
// lib/mdx/renderer.tsx
import { run } from "@mdx-js/mdx";
import * as jsxRuntime from "react/jsx-runtime";
import { mdxComponents } from "./components";

interface RenderMDXProps {
  compiledSource: string;
}

export async function MDXRenderer({ compiledSource }: RenderMDXProps) {
  const { default: MDXContent } = await run(compiledSource, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
  });

  return <MDXContent components={mdxComponents} />;
}
```

### 7.3 Custom MDX Components

```typescript
// lib/mdx/components.tsx
import type { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  // Typography overrides
  h1: ({ children, id, ...props }) => (
    <h1 id={id} className="scroll-mt-24 ..." {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, id, ...props }) => (
    <h2 id={id} className="scroll-mt-20 ..." {...props}>
      {children}
    </h2>
  ),

  // Code blocks (already highlighted by rehype-pretty-code)
  pre: ({ children, ...props }) => (
    <pre className="overflow-x-auto rounded-lg ..." {...props}>
      {children}
    </pre>
  ),

  // Smart links (internal vs external)
  a: ({ href, children, ...props }) => {
    const isExternal = href?.startsWith("http");
    return isExternal ? (
      <a href={href} target="_blank" rel="noopener" {...props}>
        {children}
      </a>
    ) : (
      <Link href={href!} {...props}>
        {children}
      </Link>
    );
  },

  // Custom components available in MDX
  Callout: CalloutComponent, // Info/Warning/Error boxes
  Quiz: QuizComponent, // Interactive quiz
  Tabs: TabsComponent, // Tabbed content
  MathBlock: MathBlockComponent, // Rendered LaTeX
  CodePlayground: PlaygroundComponent, // Editable code
  Collapse: CollapseComponent, // Expandable section
  Figure: FigureComponent, // Image with caption
};
```

### 7.4 Article Page -- Shared Resolver (Example)

This is the key to shared infrastructure. Both subject articles and teacher articles go through the same resolver:

```typescript
// app/[entitySlug]/[articleSlug]/page.tsx
import {
  getManifest,
  getCompiledMDX,
  getTableOfContents,
} from "@/lib/content/loader";
import { MDXRenderer } from "@/lib/mdx/renderer";
import { ArticleLayout } from "@/components/entity/article-layout";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ entitySlug: string; articleSlug: string }>;
}

export default async function ArticlePage({ params }: Props) {
  const { entitySlug, articleSlug } = await params;
  const locale = await getLocale(); // reads from cookie via next-intl
  const manifest = await getManifest();

  // Resolve entity type from the unified route map
  const entityInfo = manifest.routeMap[entitySlug];
  if (!entityInfo) notFound();

  // Get the article from the correct entity type
  let article: ArticleManifestEntry | undefined;
  let parentEntity: SubjectManifest | TeacherManifest | undefined;

  if (entityInfo.type === "subject") {
    parentEntity = manifest.subjects[entitySlug];
    article = parentEntity?.articles[articleSlug];
  } else if (entityInfo.type === "teacher") {
    parentEntity = manifest.teachers[entitySlug];
    article = parentEntity?.articles[articleSlug];
  } else {
    notFound(); // system articles don't have sub-articles
  }

  if (!article || !parentEntity) notFound();

  // Locale fallback: try requested -> en -> ru
  const effectiveLocale = resolveLocale(article.locales, locale);

  const [compiledSource, toc] = await Promise.all([
    getCompiledMDX(article.compiledPath.replace("{locale}", effectiveLocale)),
    getTableOfContents(article.tocPath.replace("{locale}", effectiveLocale)),
  ]);

  // SHARED ArticleLayout works for both subject and teacher articles
  // It receives the parent entity for contextual breadcrumbs/sidebar
  return (
    <ArticleLayout
      frontmatter={article.frontmatter}
      toc={toc}
      parentEntity={parentEntity}
      entityType={entityInfo.type}
      locale={effectiveLocale}
      requestedLocale={locale} // to show "not available in X" banner if fallback used
    >
      <MDXRenderer compiledSource={compiledSource} />
    </ArticleLayout>
  );
}
```

The `ArticleLayout` component is 100% shared between subject articles and teacher articles. It renders:

- Table of Contents (left)
- MDX content (center)
- Contextual sidebar (right) -- adapts based on `entityType`:
  - For subjects: difficulty, prerequisites, category navigation
  - For teachers: teacher contact info, related subjects

---

## 8. Search System

### 8.1 Architecture

```
BUILD TIME:                          CLIENT RUNTIME:

content + configs                    User types query
       │                                    │
       v                                    v
search-indexer.ts                    SearchProvider checks cache
       │                                    │
       v                              ┌─────┴─────┐
search-index-{locale}-{hash}.json    │ Fresh?     │ Stale/Missing?
       │                              │            │
       v                              v            v
copied to public/search/        Use cached     Fetch from /search/
                                 FlexSearch     index-{locale}-{hash}.json
                                 index          │
                                    │           v
                                    │      Init FlexSearch,
                                    │      save to IndexedDB
                                    │           │
                                    └─────┬─────┘
                                          v
                                    Execute query
                                          │
                                          v
                                    Render results
```

### 8.2 Client-Side Search Provider

```typescript
// components/search/search-provider.tsx
'use client'

import { createContext, useEffect, useState } from 'react'
import FlexSearch from 'flexsearch'

interface SearchContextValue {
  search: (query: string) => SearchEntry[]
  isReady: boolean
}

export const SearchContext = createContext<SearchContextValue>(...)

export function SearchProvider({
  children,
  locale,
  searchMeta  // { hash, locale } passed from server component
}: Props) {
  const [index, setIndex] = useState<FlexSearch.Index | null>(null)
  const [entries, setEntries] = useState<SearchEntry[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    async function initSearch() {
      const cacheKey = `wikipefia-search-${locale}`
      const cached = await idbGet(cacheKey)

      if (cached && cached.hash === searchMeta.hash) {
        // Cache hit - use stored index
        const idx = new FlexSearch.Index({ tokenize: 'forward' })
        // Restore from cached data
        setEntries(cached.entries)
        cached.entries.forEach((entry: SearchEntry, i: number) => {
          idx.add(i, `${entry.title} ${entry.keywords.join(' ')} ${entry.description}`)
        })
        setIndex(idx)
        setIsReady(true)
        return
      }

      // Cache miss - fetch fresh index
      const res = await fetch(`/search/index-${locale}-${searchMeta.hash}.json`)
      const freshEntries: SearchEntry[] = await res.json()

      const idx = new FlexSearch.Index({ tokenize: 'forward' })
      freshEntries.forEach((entry, i) => {
        idx.add(i, `${entry.title} ${entry.keywords.join(' ')} ${entry.description}`)
      })

      // Save to IndexedDB
      await idbSet(cacheKey, { hash: searchMeta.hash, entries: freshEntries })

      setEntries(freshEntries)
      setIndex(idx)
      setIsReady(true)
    }

    initSearch()
  }, [locale, searchMeta.hash])

  function search(query: string): SearchEntry[] {
    if (!index || !query.trim()) return []
    const resultIds = index.search(query, { limit: 20 })
    return resultIds.map(id => entries[id as number])
  }

  return (
    <SearchContext.Provider value={{ search, isReady }}>
      {children}
    </SearchContext.Provider>
  )
}
```

### 8.3 Search Dialog Component

Activated via `Cmd+K` / `Ctrl+K` shortcut. Uses Motion for enter/exit animations.

```typescript
// components/search/search-dialog.tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSearch } from "./use-search";

// Full-screen overlay with:
// - Animated backdrop blur
// - Search input with auto-focus
// - Results grouped by type (subjects, teachers, articles)
// - Keyboard navigation (arrow keys + Enter)
// - Debounced search (150ms)
// - Type badges with distinct colors
// - Highlighted matching text fragments
```

---

## 9. Internationalization (i18n) -- Cookie-Based

### 9.1 URL Structure (No Locale Prefix)

Language is stored in a `NEXT_LOCALE` cookie, **not** in the URL path. This gives clean, short, shareable URLs:

```
/                                → Home (language from cookie, default ru)
/linear-algebra                  → Subject page
/ivan-petrov                     → Teacher page
/semester-1-overview             → System article
```

The locale switcher sets the cookie and reloads the page. The same URL serves different language content depending on the user's cookie.

### 9.2 next-intl Configuration (Cookie Mode)

```typescript
// lib/i18n/config.ts
export const locales = ["ru", "en", "cz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
```

```typescript
// middleware.ts
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["ru", "en", "cz"],
  defaultLocale: "ru",
  localePrefix: "never", // KEY: no locale in URL
  localeDetection: true, // auto-detect from Accept-Language on first visit
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

```typescript
// lib/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export default getRequestConfig(async () => {
  // Read locale from cookie, fallback to Accept-Language, then default
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "ru";

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

### 9.3 Locale Switcher Component

```typescript
// components/navigation/locale-switcher.tsx
"use client";

export function LocaleSwitcher() {
  function switchLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    window.location.reload();
  }
  // renders language buttons/dropdown
}
```

### 9.4 Content Localization Strategy

- **UI strings**: `lib/i18n/messages/{locale}.json` -- button labels, navigation, static text
- **Entity metadata** (names, descriptions, keywords): `LocalizedString` objects in config JSON -- the server reads `locale` from the request and picks the right field
- **Article content**: separate MDX files per locale (`articles/ru/`, `articles/en/`, `articles/cz/`)
- **Fallback chain**: requested locale -> `en` -> `ru` (for missing MDX files or config fields)

```typescript
// lib/i18n/helpers.ts
export function resolveLocale(
  availableLocales: Locale[],
  requested: string
): Locale {
  if (availableLocales.includes(requested as Locale))
    return requested as Locale;
  if (availableLocales.includes("en")) return "en";
  if (availableLocales.includes("ru")) return "ru";
  return availableLocales[0]; // last resort
}

export function localized(obj: LocalizedString, locale: string): string {
  return obj[locale as Locale] || obj.en || obj.ru;
}
```

When an article doesn't exist in the requested locale, the page shows a banner: "This article is not available in [language]. Showing [fallback language] version."

---

## 10. Data Relationships Without a Database

The key insight: **all relationships are resolved at build time and baked into the manifest.**

### 10.1 How Teacher Ratings Appear on Subject Pages

```
content/teachers/config.json
  └── teacher "ivan-petrov" has ratings: { overall: 4.5, clarity: 4.8, ... }

content/subjects/linear-algebra/config.json
  └── teachers: ["ivan-petrov"]

          ┌──── build-content.ts resolves ────┐
          v                                    v

.content-build/manifest.json
  └── subjects["linear-algebra"].resolvedTeachers = [
        { slug: "ivan-petrov", name: {...}, ratings: { overall: 4.5, ... } }
      ]
```

The subject page reads `manifest.subjects["linear-algebra"].resolvedTeachers` and directly renders the rating. Zero API calls, zero database queries, zero runtime resolution.

### 10.2 How Article Prerequisites Work

```
Article "eigenvalues.mdx" frontmatter:
  prerequisites: ["vectors-intro", "matrix-operations"]

Build step resolves:
  manifest.subjects["linear-algebra"].articles["eigenvalues"].resolvedPrerequisites = [
    { slug: "vectors-intro", title: {...}, route: "/linear-algebra/vectors-intro" },
    { slug: "matrix-operations", title: {...}, route: "/linear-algebra/matrix-operations" }
  ]
```

Note: routes are now flat (`/linear-algebra/vectors-intro`, not `/subjects/linear-algebra/vectors-intro`).

### 10.3 How Teacher Pages List Their Subjects

```
Teacher config lists subjects: ["linear-algebra", "calculus"]

Build resolves:
  manifest.teachers["ivan-petrov"].resolvedSubjects = [
    { slug: "linear-algebra", name: { ru: "Линейная алгебра", ... } },
    { slug: "calculus", name: { ru: "Мат. анализ", ... } }
  ]
```

### 10.4 How Teacher Articles Work

Teachers have their own articles that follow the same compilation and rendering pipeline as subject articles:

```
Teacher "ivan-petrov" has articles: ["teaching-philosophy", "exam-tips"]

Routes:
  /ivan-petrov                          → Teacher front page (_front.mdx)
  /ivan-petrov/teaching-philosophy      → Teacher article
  /ivan-petrov/exam-tips                → Teacher article
```

The build script processes `content/teachers/<slug>/articles/` with the exact same MDX compilation pipeline used for subject articles.

Everything is **denormalized and pre-computed**. The tradeoff: build time increases with content volume, but runtime is instant.

---

## 11. Frontend Architecture

### 11.1 Page Layouts

**Home Page** (`app/page.tsx`):

- Hero section with animated title and search bar
- Featured/pinned system articles
- Subject grid with hover effects
- Teacher spotlight section
- All with staggered Motion entrance animations

**Entity Front Pages** (`app/[entitySlug]/page.tsx` -- resolver delegates to one of these):

- **Subject Front** (`components/front-pages/subject-front.tsx`):
  - Renders front.mdx content (course overview)
  - Article listing grouped by categories (from config)
  - Teacher cards with ratings (resolved from manifest)
  - Subject metadata (semester, credits, difficulty)
- **Teacher Front** (`components/front-pages/teacher-front.tsx`):
  - Teacher profile header with photo
  - Rating breakdown (visual bars/stars)
  - Subject list with links
  - Student reviews section
  - Teacher's articles listing (if any, grouped by sections)
  - Renders front.mdx content (teacher bio/info)
- **System Article**: renders directly as a standalone article (no front page wrapper)

**Article Page** (`app/[entitySlug]/[articleSlug]/page.tsx`) -- **shared between subjects and teachers:**

- Three-column layout on desktop:
  - Left: Table of Contents (sticky, scroll-tracking)
  - Center: Article content (MDX rendered)
  - Right: Article meta sidebar -- adapts by entity type:
    - Subject article: difficulty, prerequisites, category navigation, tutors
    - Teacher article: teacher contact info, related subjects
- On mobile: ToC collapses into a dropdown, meta moves above/below content
- Smooth scroll-to-heading on ToC click
- Reading progress bar
- Breadcrumbs: Home > Entity Name > Article Title

### 11.2 Shared vs Specialized Component Split

```
SHARED (components/entity/):
  article-layout.tsx        ← Used by BOTH subject and teacher articles
  table-of-contents.tsx     ← Identical for all article types
  article-meta.tsx          ← Accepts entityType prop, renders conditionally

SPECIALIZED (components/front-pages/):
  subject-front.tsx         ← Subject-specific front page layout
  teacher-front.tsx         ← Teacher-specific front page layout

SHARED INFRASTRUCTURE:
  lib/mdx/renderer.tsx      ← One MDX renderer for everything
  lib/content/loader.ts     ← One loader for all entity types
```

### 11.3 Component Architecture

```
SearchProvider (client, wraps entire app)
  └── Header (server, with client search trigger + locale switcher)
  └── Page content (server)
      ├── [entitySlug] resolver
      │   ├── SubjectFront / TeacherFront (specialized front pages)
      │   └── SystemArticlePage (standalone)
      └── [entitySlug]/[articleSlug] resolver
          └── ArticleLayout (SHARED)
              └── MDXRenderer (server, renders pre-compiled MDX)
                  └── Custom MDX components (mix of server/client)
  └── SearchDialog (client, portal, animated)
```

### 11.4 Motion Animations

Key animation moments:

- **Page load**: staggered fade-up for hero elements, cards, sections
- **Search open/close**: backdrop blur, scale-in dialog, staggered results
- **Navigation**: page transitions via `AnimatePresence` + `layoutId`
- **Article ToC**: smooth highlight tracking on scroll
- **Hover states**: card lifts, image zooms, button morphs
- **System**: respect `prefers-reduced-motion`

---

## 12. CI/CD Pipeline

### 12.1 Main Repository Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  repository_dispatch:
    types: [content-updated]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout main repo
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Pull content from GitHub repos
        run: pnpm content:pull
        env:
          GITHUB_TOKEN: ${{ secrets.CONTENT_GITHUB_TOKEN }}

      - name: Compile content
        run: pnpm content:compile

      - name: Build Next.js
        run: pnpm build:local # skips content:pull since already done

      - name: Deploy
        # Vercel / Cloudflare Pages / self-hosted
        run: ...
```

### 12.2 Content Repository Webhook

Every content repository (subject repos, system articles repo, teachers repo) has:

```yaml
# .github/workflows/notify-main.yml
name: Trigger Main Build

on:
  push:
    branches: [main]

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch to main repo
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.MAIN_REPO_PAT }}
          repository: org/wikipefia
          event-type: content-updated
          client-payload: '{"repo": "${{ github.repository }}", "sha": "${{ github.sha }}"}'
```

This means: push to any content repo -> main repo rebuilds with fresh content -> deploy.

### 12.3 Content Repository Structure (Templates)

**Subject repository template:**

```
subject-linear-algebra/
├── config.json
├── articles/
│   ├── ru/
│   │   ├── _front.mdx
│   │   ├── vectors-intro.mdx
│   │   └── matrix-operations.mdx
│   ├── en/
│   │   ├── _front.mdx
│   │   └── vectors-intro.mdx
│   └── cz/
│       └── _front.mdx
├── assets/
│   ├── vector-diagram.svg
│   └── matrix-multiplication.png
└── .github/
    └── workflows/
        └── notify-main.yml
```

**Teacher repository template** (same structure, different content):

```
teacher-ivan-petrov/
├── config.json
├── articles/
│   ├── ru/
│   │   ├── _front.mdx
│   │   ├── teaching-philosophy.mdx
│   │   └── exam-tips.mdx
│   ├── en/
│   │   └── _front.mdx
│   └── cz/
│       └── _front.mdx
├── assets/
│   └── photo.jpg
└── .github/
    └── workflows/
        └── notify-main.yml
```

Both templates use the identical file structure (`config.json` + `articles/{locale}/` + `assets/`). The only difference is the config schema and the front page layout.

---

## 13. Development Stages (Roadmap)

### STAGE 1: Frontend Design (no technical backend)

**Goal**: Create 5 visually distinct design variants with all pages, fully mocked.

**What gets built:**

- 5 complete design systems (different typography, colors, layout philosophy, animation style)
- Each variant includes:
  - Home page (hero + search + featured content)
  - Subject front page (course overview, categories, teacher cards)
  - Teacher front page (profile, ratings, reviews, articles)
  - Article page -- shared layout (ToC, content, sidebar)
  - Search overlay (Cmd+K dialog)
  - Locale switcher
- All data is hardcoded mock data (no config loading, no MDX rendering)
- Motion animations for all interactive elements
- Responsive across mobile/tablet/desktop
- URLs follow the flat routing scheme (`/mock-subject`, `/mock-subject/mock-article`, `/mock-teacher`)

**Deliverable**: User reviews all 5 and selects one (or a mashup). Selected design becomes the production design.

**Key files created:**

- `components/` -- all UI components
- `app/` -- pages with mock data using flat routing
- `globals.css` -- design tokens, typography, colors

### STAGE 2: Technical Infrastructure

**Goal**: Replace all mocks with real content pipeline.

**Phase 2.1** -- Content pipeline:

- Implement Zod schemas (`lib/schemas/`) for all entities (subjects, teachers, articles, system articles)
- Write `scripts/build-content.ts` -- the core build orchestrator
- Write `scripts/pull-content.ts` -- GitHub content fetcher
- Implement `scripts/validate-routes.ts` -- global slug uniqueness checker across the flat namespace
- Generate `route-map.json` for entity type resolution
- Add unit tests for the entire pipeline

**Phase 2.2** -- MDX rendering (shared infrastructure):

- Install and configure `@mdx-js/mdx` with all plugins
- Implement `lib/mdx/renderer.tsx` and `lib/mdx/components.tsx`
- Build the shared `ArticleLayout` that works for both subject and teacher articles
- Build the specialized front pages (`SubjectFront`, `TeacherFront`)
- Create sample content repos (1 subject + 1 teacher) to test with
- Verify custom components work inside MDX

**Phase 2.3** -- Search:

- Implement `lib/content/search-indexer.ts` (indexes subjects, teachers, all article types, system articles)
- Build `SearchProvider` with FlexSearch + IndexedDB caching
- Create `SearchDialog` with animations
- Hook into the build pipeline

**Phase 2.4** -- i18n (cookie-based):

- Install and configure `next-intl` with `localePrefix: 'never'`
- Create `middleware.ts` for cookie-based locale detection
- Build `LocaleSwitcher` component (sets cookie, reloads)
- Write UI translation files (`ru.json`, `en.json`, `cz.json`)
- Implement locale-aware content loading with fallback chain

**Phase 2.5** -- Integration:

- Replace all mock data with manifest-driven data loading
- Implement entity resolver in `app/[entitySlug]/page.tsx`
- Implement shared article resolver in `app/[entitySlug]/[articleSlug]/page.tsx`
- Implement `generateStaticParams` for all dynamic routes
- Wire up search index to `public/`
- End-to-end test: push content -> build -> verify all pages render

### STAGE 3: Deployment, Polish, and Fundamentals

**Phase 3.1** -- CI/CD:

- Set up GitHub Actions workflow for main repo
- Create webhook workflows for content repos (subjects + teachers + system)
- Configure deployment target (Vercel / Cloudflare / self-hosted)
- Set up staging environment

**Phase 3.2** -- Testing:

- Vitest for build pipeline unit tests (schema validation, route validation, relationship resolution)
- Playwright for E2E (page renders, search works, navigation, cookie-based i18n)
- Lighthouse CI for performance regression tracking
- Accessibility audit (axe-core)

**Phase 3.3** -- Polish:

- SEO: meta tags, OpenGraph, JSON-LD structured data
- Error states: custom 404, graceful fallbacks for missing translations
- Loading states: skeleton screens, Suspense boundaries
- Performance: analyze bundle, optimize images, preload critical fonts

**Phase 3.4** -- Fundamentals of Wikipefia:

This is a comprehensive documentation package that lives inside the project (e.g., `docs/fundamentals/`) and serves as the canonical guide for anyone maintaining or contributing content to Wikipefia.

Contents:

- **Content Authoring Guide** (`authoring-guide.md`):
  - How to write MDX articles (syntax, available components, frontmatter schema)
  - Article structure templates: what a good article looks like, recommended heading hierarchy, section patterns
  - How to use custom components (`<Callout>`, `<Quiz>`, `<Tabs>`, `<CodePlayground>`, etc.)
  - Image handling: where to put assets, how to reference them, optimization tips
  - Math/LaTeX syntax guide
  - Code block syntax with language highlighting
- **Content Repository Setup Guide** (`repo-setup-guide.md`):
  - How to create a new subject repository from the template
  - How to create a new teacher repository from the template
  - Config.json schema reference with examples
  - How to set up the GitHub Actions webhook for auto-deployment
  - How to add the repo to `content-sources.json` in the main project
- **Maintainer Operations Manual** (`maintainer-manual.md`):
  - How the build pipeline works (pull -> compile -> build)
  - How to run the build locally
  - How to debug build failures (schema errors, route collisions, missing references)
  - How to add a new entity type in the future
  - How to add new MDX components
  - How to add a new locale
- **AI Prompts and Instructions** (`ai-prompts.md`):
  - Prompts for generating article content in the correct MDX format
  - Prompts for translating articles between locales
  - Prompts for reviewing articles for quality and consistency
  - Template prompts for creating new subject/teacher repos from scratch
  - Quality checklist prompts for content review
- **Article Content Templates** (`templates/`):
  - `subject-front-template.mdx` -- template for subject overview articles
  - `teacher-front-template.mdx` -- template for teacher profile articles
  - `lecture-article-template.mdx` -- template for lecture-style articles
  - `tutorial-article-template.mdx` -- template for step-by-step tutorials
  - `reference-article-template.mdx` -- template for reference/cheat-sheet articles
  - `system-article-template.mdx` -- template for system articles

---

## 14. Key Architecture Decisions Summary

- **Flat routing**: No `/subjects/` or `/teachers/` prefixes -- every entity owns a top-level slug. A universal resolver in `app/[entitySlug]/page.tsx` dispatches to the correct renderer based on the manifest's route map.
- **Cookie-based i18n**: Language is stored in a `NEXT_LOCALE` cookie, not the URL. Cleaner URLs, same content pipeline.
- **Teachers are full content entities**: Teachers have their own repos, configs, `_front.mdx`, and multiple articles -- structurally identical to subjects, but with a different front page layout.
- **Shared article infrastructure**: `ArticleLayout`, `MDXRenderer`, `TableOfContents` are entity-agnostic. Only front pages (`SubjectFront`, `TeacherFront`) are specialized.
- **No database**: All data is configs + MDX, resolved at build time into a denormalized manifest
- **Pre-compiled MDX**: `@mdx-js/mdx compile()` runs in a build script BEFORE `next build`, so Next.js only calls lightweight `run()` during SSG
- **Client-side search**: Build generates per-locale JSON indexes, client caches in IndexedDB, FlexSearch handles queries -- no server involved
- **Content from GitHub repos**: `content:pull` script clones repos, CI/CD webhooks trigger rebuilds on content changes
- **Global slug uniqueness**: Build-time validation enforces that ALL top-level slugs (subjects + teachers + system articles) are unique across the entire flat namespace. Collisions are fatal build errors with detailed, actionable messages.
- **Fundamentals of Wikipefia**: Comprehensive documentation package with content authoring guides, AI prompts, article templates, maintainer manual, and repo setup instructions
