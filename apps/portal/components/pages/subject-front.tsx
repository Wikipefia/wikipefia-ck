"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { C, getSubjectTheme } from "@/lib/theme";
import type { SubjectManifest } from "@/lib/content/types";
import type { Locale } from "@/lib/i18n/config";

function loc(obj: Record<string, string>, locale: string): string {
  return obj[locale] || obj.en || obj.ru || "";
}

interface SubjectFrontProps {
  subject: SubjectManifest;
  locale: Locale;
  children?: React.ReactNode;
}

export function SubjectFront({ subject, locale, children }: SubjectFrontProps) {
  const config = subject.config;
  const theme = getSubjectTheme(config.slug);
  const t = useTranslations("common");
  const tEntity = useTranslations("entity");
  const totalArticles = config.categories.reduce(
    (acc, cat) => acc + cat.articles.length,
    0
  );

  return (
    <>
      {/* ── HEADER ── */}
      <section className="border-b" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span
                className="text-[11px] font-bold px-2 uppercase tracking-wider"
                style={{ backgroundColor: theme.accent, color: "#fff" }}
              >
                {theme.icon} {t("subject")}
              </span>
              {config.metadata?.semester && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider border"
                  style={{ borderColor: C.borderLight, color: C.textMuted }}
                >
                  {t("semesterNumber", { number: config.metadata.semester })}
                </span>
              )}
              {config.metadata?.credits && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider border"
                  style={{ borderColor: C.borderLight, color: C.textMuted }}
                >
                  {t("ects", { number: config.metadata.credits })}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-none tracking-tighter uppercase mb-4">
              {loc(config.name, locale)}
            </h1>
            <p
              className="text-base leading-relaxed uppercase max-w-2xl"
              style={{ color: C.textMuted }}
            >
              {loc(config.description, locale)}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── METADATA BAR ── */}
      <section className="border-b" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px">
            {[
              {
                label: t("departmentLabel"),
                value: config.metadata?.department
                  ? loc(config.metadata.department, locale)
                  : "—",
              },
              {
                label: t("semesterLabel"),
                value: `${config.metadata?.semester || "—"}`,
              },
              {
                label: t("creditsLabel"),
                value: config.metadata?.credits
                  ? t("ects", { number: config.metadata.credits })
                  : "—",
              },
              { label: t("articlesLabel2"), value: `${totalArticles}` },
            ].map((item) => (
              <div key={item.label} className="py-4">
                <div
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: C.textMuted }}
                >
                  {item.label}
                </div>
                <div className="text-base font-bold uppercase">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES & ARTICLES ── */}
      <section className="border-b" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div
            className="text-[11px] font-bold uppercase tracking-wider mb-8"
            style={{ color: theme.accent }}
          >
            {tEntity("categories")}
          </div>

          <div className="space-y-6">
            {config.categories.map((category, ci) => {
              // Find article metadata from manifest
              const categoryArticles = category.articles
                .map((slug) => {
                  const article = subject.articles[slug];
                  if (!article) return null;
                  return {
                    slug,
                    title: loc(article.frontmatter.title, locale),
                    readTime: article.frontmatter.estimatedReadTime,
                  };
                })
                .filter(Boolean) as Array<{
                slug: string;
                title: string;
                readTime?: number;
              }>;

              return (
                <motion.div
                  key={category.slug}
                  className="border"
                  style={{ borderColor: C.borderLight }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: ci * 0.1 }}
                >
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: C.headerBg, color: C.headerText }}
                  >
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {loc(category.name, locale)}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider opacity-60">
                      {t("articlesCount", { count: categoryArticles.length })}
                    </span>
                  </div>

                  {categoryArticles.map((article, ai) => (
                    <Link
                      key={article.slug}
                      href={`/${config.slug}/${article.slug}`}
                      className="flex items-center justify-between px-4 py-3 group transition-colors"
                      style={{
                        borderBottom:
                          ai < categoryArticles.length - 1
                            ? `1px solid ${C.borderLight}`
                            : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[11px]"
                          style={{ color: theme.accent }}
                        >
                          ▸
                        </span>
                        <span className="text-base uppercase font-medium group-hover:underline">
                          {article.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {article.readTime && (
                          <span
                            className="text-[11px] uppercase"
                            style={{ color: C.textMuted }}
                          >
                            {t("min", { minutes: article.readTime })}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FACULTY ── */}
      {subject.resolvedTeachers.length > 0 && (
        <section>
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-6"
              style={{ color: C.accent }}
            >
              {tEntity("faculty")}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {subject.resolvedTeachers.map((teacher) => (
                <Link
                  key={teacher.slug}
                  href={`/${teacher.slug}`}
                  className="border group transition-colors block"
                  style={{ borderColor: C.borderLight }}
                >
                  <div
                    className="px-4 py-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider"
                    style={{ borderBottom: `1px solid ${C.borderLight}` }}
                  >
                    <span className="group-hover:underline">
                      {loc(teacher.name, locale)}
                    </span>
                    <span style={{ color: C.accent }}>
                      {teacher.ratings.overall}/5.0
                    </span>
                  </div>
                  <div className="px-4 py-4">
                    <div
                      className="text-[11px] uppercase"
                      style={{ color: C.textMuted }}
                    >
                      {t("reviewsCount", { count: teacher.ratings.count })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FRONT CONTENT (from _front article) ── */}
      {children && (
        <section className="border-b" style={{ borderColor: C.borderLight }}>
          <div className="max-w-4xl mx-auto px-4 py-12 prose-wiki">
            {children}
          </div>
        </section>
      )}
    </>
  );
}
