import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PageShell } from "@/components/shared/page-shell";
import { ArticlePage } from "@/components/pages/article-page";
import { MDXRenderer } from "@/lib/mdx/renderer";
import {
  getManifest,
  getCompiledMDX,
  getTableOfContents,
} from "@/lib/content/loader";
import { localized, resolveLocale } from "@/lib/i18n/helpers";
import type { Locale } from "@/lib/i18n/config";

interface Props {
  params: Promise<{ entitySlug: string; articleSlug: string }>;
}

export async function generateStaticParams() {
  try {
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
  } catch {
    return [];
  }
}

export default async function ArticleRoute({ params }: Props) {
  const { entitySlug, articleSlug } = await params;
  const locale = (await getLocale()) as Locale;

  let manifest;
  try {
    manifest = await getManifest();
  } catch {
    notFound();
  }

  const entityInfo = manifest.routeMap[entitySlug];
  if (!entityInfo) notFound();

  // Get article from the correct entity type
  let article;
  let parentName: string;
  let entityType: "subject" | "teacher";
  let siblingArticles: Array<{ slug: string; title: string; category?: string }> = [];
  let prevArticle: { slug: string; title: string } | null = null;
  let nextArticle: { slug: string; title: string } | null = null;

  if (entityInfo.type === "subject") {
    const subject = manifest.subjects[entitySlug];
    if (!subject) notFound();
    article = subject.articles[articleSlug];
    parentName = localized(subject.config.name, locale);
    entityType = "subject";

    // Build ordered article list from categories
    const orderedArticles: Array<{ slug: string; title: string; category: string }> = [];
    for (const cat of subject.config.categories) {
      for (const slug of cat.articles) {
        const a = subject.articles[slug];
        if (a && slug !== "_front") {
          orderedArticles.push({
            slug,
            title: localized(a.frontmatter.title, locale),
            category: localized(cat.name, locale),
          });
        }
      }
    }
    siblingArticles = orderedArticles;

    // Find prev/next
    const currentIdx = orderedArticles.findIndex((a) => a.slug === articleSlug);
    if (currentIdx > 0) {
      prevArticle = orderedArticles[currentIdx - 1];
    }
    if (currentIdx >= 0 && currentIdx < orderedArticles.length - 1) {
      nextArticle = orderedArticles[currentIdx + 1];
    }
  } else if (entityInfo.type === "teacher") {
    const teacher = manifest.teachers[entitySlug];
    if (!teacher) notFound();
    article = teacher.articles[articleSlug];
    parentName = localized(teacher.config.name, locale);
    entityType = "teacher";

    // Build article list from teacher articles
    const teacherArticles = Object.entries(teacher.articles)
      .filter(([slug]) => slug !== "_front")
      .map(([slug, a]) => ({
        slug,
        title: localized(a.frontmatter.title, locale),
      }));
    siblingArticles = teacherArticles;

    const currentIdx = teacherArticles.findIndex((a) => a.slug === articleSlug);
    if (currentIdx > 0) {
      prevArticle = teacherArticles[currentIdx - 1];
    }
    if (currentIdx >= 0 && currentIdx < teacherArticles.length - 1) {
      nextArticle = teacherArticles[currentIdx + 1];
    }
  } else {
    notFound();
  }

  if (!article) notFound();

  // Locale fallback
  const effectiveLocale = resolveLocale(article.locales, locale);
  const isFallback = effectiveLocale !== locale;

  const [compiledSource, toc] = await Promise.all([
    getCompiledMDX(article.compiledPath, effectiveLocale),
    getTableOfContents(article.tocPath, effectiveLocale),
  ]);

  const articleTitle = localized(article.frontmatter.title, locale);

  return (
    <PageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: parentName, href: `/${entitySlug}` },
        { label: articleTitle },
      ]}
      locale={locale}
    >
      <ArticlePage
        frontmatter={article.frontmatter}
        toc={toc}
        entitySlug={entitySlug}
        articleSlug={articleSlug}
        entityType={entityType}
        parentName={parentName}
        locale={locale}
        isFallback={isFallback}
        fallbackLocale={isFallback ? effectiveLocale : undefined}
        siblingArticles={siblingArticles}
        prevArticle={prevArticle}
        nextArticle={nextArticle}
      >
        <MDXRenderer compiledSource={compiledSource} />
      </ArticlePage>
    </PageShell>
  );
}
