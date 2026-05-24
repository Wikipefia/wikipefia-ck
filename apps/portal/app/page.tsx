import { getLocale } from "next-intl/server";
import { HomePage } from "@/components/pages/home-page";
import type { Locale } from "@/lib/i18n/config";

async function getHomeData(locale: Locale) {
  try {
    const { getManifest } = await import("@/lib/content/loader");
    const manifest = await getManifest();

    const subjects = Object.values(manifest.subjects).map((s) => ({
      slug: s.config.slug,
      name: s.config.name[locale] || s.config.name.en,
      description: s.config.description[locale] || s.config.description.en,
      articleCount: Object.keys(s.articles).filter((k) => k !== "_front").length,
      difficulty: s.config.metadata?.difficulty || "medium",
      semester: s.config.metadata?.semester || 1,
      credits: s.config.metadata?.credits || 0,
    }));

    const teachers = Object.values(manifest.teachers).map((t) => ({
      slug: t.config.slug,
      name: t.config.name[locale] || t.config.name.en,
      description: t.config.description[locale] || t.config.description.en,
      ratings: t.config.ratings,
      subjects: t.resolvedSubjects.map((s) => s.slug),
    }));

    const systemArticles = Object.values(manifest.systemArticles)
      .filter((a) => a.config.pinned)
      .sort((a, b) => (a.config.order || 0) - (b.config.order || 0))
      .map((a) => ({
        slug: a.config.slug,
        name: a.config.name[locale] || a.config.name.en,
        description: a.config.description
          ? a.config.description[locale] || a.config.description.en
          : "",
        route: a.config.route,
      }));

    return { subjects, teachers, systemArticles, fromManifest: true };
  } catch {
    // Fallback to mock data for dev
    const { subjects, teachers } = await import("@/lib/mock-data");
    return {
      subjects: subjects.map((s) => ({
        slug: s.slug,
        name: s.name[locale] || s.name.en,
        description: s.description[locale] || s.description.en,
        articleCount: s.articleCount,
        difficulty: s.difficulty,
        semester: s.semester,
        credits: s.credits,
      })),
      teachers: teachers.map((t) => ({
        slug: t.slug,
        name: t.name[locale] || t.name.en,
        description: t.description[locale] || t.description.en,
        ratings: t.ratings,
        subjects: t.subjects,
      })),
      systemArticles: [] as Array<{
        slug: string;
        name: string;
        description: string;
        route: string;
      }>,
      fromManifest: false,
    };
  }
}

export default async function Home() {
  const locale = (await getLocale()) as Locale;
  const data = await getHomeData(locale);

  return <HomePage data={data} locale={locale} />;
}
