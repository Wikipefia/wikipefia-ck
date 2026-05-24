"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { C } from "@/lib/theme";
import type { ArticleFrontmatterType } from "@/lib/schemas";
import type { TocEntry } from "@/lib/content/types";

function loc(obj: Record<string, string>, locale: string): string {
  return obj[locale] || obj.en || obj.ru || "";
}

/* ── Table of Contents (right sidebar) ── */
function TableOfContents({
  toc,
  activeId,
}: {
  toc: TocEntry[];
  activeId: string;
}) {
  if (toc.length === 0) return null;

  return (
    <nav className="space-y-0.5">
      {toc.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          className="block text-[12px] uppercase py-1 transition-colors hover:underline"
          style={{
            paddingLeft: entry.depth >= 3 ? "12px" : "0",
            color: activeId === entry.id ? C.text : C.textMuted,
            fontWeight: activeId === entry.id ? 600 : 400,
          }}
        >
          {entry.text}
        </a>
      ))}
    </nav>
  );
}

/* ── Article Sidebar (left - list of articles in subject) ── */
function ArticleSidebar({
  articles,
  currentSlug,
  entitySlug,
}: {
  articles: Array<{ slug: string; title: string; category?: string }>;
  currentSlug: string;
  entitySlug: string;
}) {
  if (articles.length === 0) return null;

  // Group by category
  const t = useTranslations("common");
  const groups: Record<string, Array<{ slug: string; title: string }>> = {};
  for (const a of articles) {
    const cat = a.category || t("articles");
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  }

  return (
    <nav className="space-y-4">
      {Object.entries(groups).map(([cat, items], index) => (
        <div key={cat}>
          {Object.keys(groups).length > 1 && (
            <div
              className={`text-[10px] uppercase tracking-[0.2em] mb-1.5 font-extrabold ${
                index !== 0 ? "mt-8" : ""
              }`}
              style={{ color: C.textMuted }}
            >
              {cat}
            </div>
          )}
          {items.map((a) => (
            <Link
              key={a.slug}
              href={`/${entitySlug}/${a.slug}`}
              className="block text-[12px] uppercase py-1 transition-colors hover:underline"
              style={{
                color: a.slug === currentSlug ? C.text : C.textMuted,
                fontWeight: a.slug === currentSlug ? 600 : 400,
              }}
            >
              {a.slug === currentSlug && <span className="mr-1">›</span>}
              {a.title}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

/* ── Prev / Next Navigation ── */
function ArticleNavigation({
  prev,
  next,
  entitySlug,
  t,
}: {
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  entitySlug: string;
  t: (key: string) => string;
}) {
  if (!prev && !next) return null;

  return (
    <div
      className="mt-12 pt-6 grid grid-cols-2 gap-4"
      style={{ borderTop: `1px solid ${C.borderLight}` }}
    >
      {prev ? (
        <Link
          href={`/${entitySlug}/${prev.slug}`}
          className="border p-4 group transition-colors"
          style={{ borderColor: C.borderLight }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: C.textMuted }}
          >
            {t("previous")}
          </div>
          <div className="text-sm font-bold uppercase group-hover:underline">
            {prev.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/${entitySlug}/${next.slug}`}
          className="border p-4 group transition-colors text-right"
          style={{ borderColor: C.borderLight }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: C.textMuted }}
          >
            {t("next")}
          </div>
          <div className="text-sm font-bold uppercase group-hover:underline">
            {next.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}

/* ── Article Page ── */
interface ArticlePageProps {
  frontmatter: ArticleFrontmatterType;
  toc: TocEntry[];
  entitySlug: string;
  articleSlug: string;
  entityType: "subject" | "teacher";
  parentName: string;
  locale: string;
  isFallback?: boolean;
  fallbackLocale?: string;
  children: React.ReactNode; // MDX rendered content
  // Navigation data
  siblingArticles?: Array<{ slug: string; title: string; category?: string }>;
  prevArticle?: { slug: string; title: string } | null;
  nextArticle?: { slug: string; title: string } | null;
}

export function ArticlePage({
  frontmatter,
  toc,
  entitySlug,
  articleSlug,
  entityType,
  parentName,
  locale,
  isFallback,
  fallbackLocale,
  children,
  siblingArticles = [],
  prevArticle,
  nextArticle,
}: ArticlePageProps) {
  const [activeId, setActiveId] = useState(toc[0]?.id || "");
  const articleRef = useRef<HTMLElement>(null);
  const t = useTranslations("common");
  const tEntity = useTranslations("entity");

  const title = loc(frontmatter.title, locale);

  /* Hide duplicate first heading if it matches the article title */
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const firstHeading = el.querySelector("h1, h2");
    if (!firstHeading) return;
    const headingText = (firstHeading.textContent || "").trim().toLowerCase();
    const titleText = title.trim().toLowerCase();
    if (headingText === titleText) {
      (firstHeading as HTMLElement).style.display = "none";
      // Also hide the border-top of the heading if present
      const next = firstHeading.nextElementSibling;
      if (next && next.tagName.match(/^H[1-6]$/)) {
        (next as HTMLElement).style.marginTop = "0";
        (next as HTMLElement).style.paddingTop = "0";
        (next as HTMLElement).style.borderTop = "none";
      }
    }
  }, [title]);

  /* Scroll spy for ToC */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Fallback banner */}
      {isFallback && fallbackLocale && (
        <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 mb-6">
          <p
            className="text-[12px] uppercase tracking-wider"
            style={{ color: "#b45309" }}
          >
            {t("articleNotAvailable", { locale: fallbackLocale.toUpperCase() })}
          </p>
        </div>
      )}

      {/* ── Article header ── */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span
            className="text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider"
            style={{ backgroundColor: C.headerBg, color: C.headerText }}
          >
            {entityType === "subject" ? tEntity("subjectArticle") : tEntity("teacherArticle")}
          </span>
          {frontmatter.estimatedReadTime && (
            <span
              className="text-[11px] px-2 py-0.5 uppercase tracking-wider border"
              style={{ borderColor: C.borderLight, color: C.textMuted }}
            >
              {t("readTime", { minutes: frontmatter.estimatedReadTime })}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tighter uppercase">
          {title}
        </h1>
      </motion.div>

      {/* ── Two-column layout with sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-8">
        {/* Left: Article list in subject */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <ArticleSidebar
              articles={siblingArticles}
              currentSlug={articleSlug}
              entitySlug={entitySlug}
            />
          </div>
        </aside>

        {/* Mobile ToC */}
        <div className="lg:hidden mb-6 col-span-full">
          <details className="border" style={{ borderColor: C.borderLight }}>
            <summary
              className="px-4 py-2 cursor-pointer text-[11px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: C.headerBg, color: C.headerText }}
            >
              {t("tableOfContentsCount", { count: toc.length })}
            </summary>
            <div className="px-4 py-2">
              {toc.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  className="block text-[12px] uppercase py-1 hover:underline"
                  style={{
                    paddingLeft: entry.depth >= 3 ? "12px" : "0",
                    color: C.textMuted,
                  }}
                >
                  {entry.text}
                </a>
              ))}
            </div>
          </details>
        </div>

        {/* Center: Article Content (MDX) */}
        <article ref={articleRef} className="min-w-0 prose-wiki">
          {children}
        </article>

        {/* Right: Table of Contents */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <TableOfContents toc={toc} activeId={activeId} />
          </div>
        </aside>
      </div>

      {/* Prev / Next Navigation */}
      <ArticleNavigation
        prev={prevArticle}
        next={nextArticle}
        entitySlug={entitySlug}
        t={t}
      />

      {/* End marker */}
      <div
        className="mt-8 pt-6 text-center"
        style={{ borderTop: `1px solid ${C.borderLight}` }}
      >
        <Link
          href={`/${entitySlug}`}
          className="inline-block border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors hover:underline"
          style={{ borderColor: C.borderLight }}
        >
          ← {t("backTo", { name: parentName })}
        </Link>
      </div>
    </div>
  );
}
