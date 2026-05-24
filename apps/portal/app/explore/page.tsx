import { getLocale } from "next-intl/server";
import { ExplorePage } from "@/components/pages/explore-page";
import type { Locale } from "@/lib/i18n/config";

export interface ExploreArticle {
  slug: string;
  parentSlug: string;
  title: string;
  difficulty?: string;
  readTime?: number;
  author?: string;
  locales: string[];
}

export interface ExploreSubject {
  slug: string;
  name: string;
  description: string;
  difficulty: string;
  semester: number;
  credits: number;
  department: string;
  articles: ExploreArticle[];
  teachers: string[];
}

export interface ExploreTeacher {
  slug: string;
  name: string;
  description: string;
  ratings: {
    overall: number;
    clarity: number;
    difficulty: number;
    usefulness: number;
    count: number;
  };
  subjects: string[];
  contact?: {
    email?: string;
    office?: string;
    website?: string;
  };
  articles: ExploreArticle[];
}

export interface ExploreSystemArticle {
  slug: string;
  name: string;
  description: string;
  route: string;
  pinned: boolean;
  locales: string[];
}

export interface ExploreData {
  subjects: ExploreSubject[];
  teachers: ExploreTeacher[];
  systemArticles: ExploreSystemArticle[];
  buildTime: string;
  buildHash: string;
}

function loc(obj: Record<string, string>, locale: string): string {
  return obj[locale] || obj.en || obj.ru || "";
}

async function getExploreData(locale: Locale): Promise<ExploreData> {
  const { getManifest } = await import("@/lib/content/loader");
  const manifest = await getManifest();

  const subjects: ExploreSubject[] = Object.values(manifest.subjects).map((s) => {
    const articles: ExploreArticle[] = Object.entries(s.articles)
      .filter(([key]) => key !== "_front")
      .map(([slug, a]) => ({
        slug,
        parentSlug: s.config.slug,
        title: loc(a.frontmatter.title, locale),
        difficulty: a.frontmatter.difficulty,
        readTime: a.frontmatter.estimatedReadTime,
        author: a.frontmatter.author,
        locales: a.locales,
      }));

    return {
      slug: s.config.slug,
      name: loc(s.config.name, locale),
      description: loc(s.config.description, locale),
      difficulty: s.config.metadata?.difficulty || "medium",
      semester: s.config.metadata?.semester || 1,
      credits: s.config.metadata?.credits || 0,
      department: s.config.metadata?.department
        ? loc(s.config.metadata.department, locale)
        : "—",
      articles,
      teachers: s.resolvedTeachers.map((t) => loc(t.name, locale)),
    };
  });

  const teachers: ExploreTeacher[] = Object.values(manifest.teachers).map((t) => {
    const articles: ExploreArticle[] = Object.entries(t.articles)
      .filter(([key]) => key !== "_front")
      .map(([slug, a]) => ({
        slug,
        parentSlug: t.config.slug,
        title: loc(a.frontmatter.title, locale),
        difficulty: a.frontmatter.difficulty,
        readTime: a.frontmatter.estimatedReadTime,
        locales: a.locales,
      }));

    return {
      slug: t.config.slug,
      name: loc(t.config.name, locale),
      description: loc(t.config.description, locale),
      ratings: t.config.ratings,
      subjects: t.resolvedSubjects.map((s) => loc(s.name, locale)),
      contact: t.config.contacts
        ? {
            email: t.config.contacts.email,
            office: t.config.contacts.office
              ? loc(t.config.contacts.office, locale)
              : undefined,
            website: t.config.contacts.website,
          }
        : undefined,
      articles,
    };
  });

  const systemArticles: ExploreSystemArticle[] = Object.values(manifest.systemArticles)
    .sort((a, b) => (a.config.order || 0) - (b.config.order || 0))
    .map((a) => ({
      slug: a.config.slug,
      name: loc(a.config.name, locale),
      description: a.config.description
        ? loc(a.config.description, locale)
        : "",
      route: a.config.route,
      pinned: a.config.pinned || false,
      locales: a.locales,
    }));

  return {
    subjects,
    teachers,
    systemArticles,
    buildTime: manifest.buildTime,
    buildHash: manifest.buildHash,
  };
}

export default async function Explore() {
  const locale = (await getLocale()) as Locale;
  const data = await getExploreData(locale);

  return <ExplorePage data={data} locale={locale} />;
}
