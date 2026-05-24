"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { C, getSubjectTheme } from "@/lib/theme";
import type { TeacherManifest } from "@/lib/content/types";
import type { Locale } from "@/lib/i18n/config";

function loc(obj: Record<string, string>, locale: string): string {
  return obj[locale] || obj.en || obj.ru || "";
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[11px] uppercase tracking-wider w-20 shrink-0"
        style={{ color: C.textMuted }}
      >
        {label}
      </span>
      <div className="flex-1 h-2 border" style={{ borderColor: C.borderLight }}>
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: C.accent,
            opacity: value >= 4 ? 1 : value >= 3 ? 0.7 : 0.5,
          }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums w-8 text-right">
        {value}
      </span>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-wider" style={{ color: C.accent }}>
      {"★".repeat(Math.floor(rating))}
      {"☆".repeat(5 - Math.floor(rating))}
    </span>
  );
}

interface TeacherFrontProps {
  teacher: TeacherManifest;
  locale: Locale;
}

export function TeacherFront({ teacher, locale }: TeacherFrontProps) {
  const config = teacher.config;
  const t = useTranslations("common");
  const tEntity = useTranslations("entity");

  // Get non-front articles for listing
  const articleEntries = Object.entries(teacher.articles)
    .filter(([slug]) => slug !== "_front")
    .map(([slug, article]) => ({
      slug,
      title: loc(article.frontmatter.title, locale),
      readTime: article.frontmatter.estimatedReadTime,
    }));

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
                className="text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider"
                style={{ backgroundColor: C.headerBg, color: C.headerText }}
              >
                {t("teacher")}
              </span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider border"
                style={{ borderColor: C.borderLight, color: C.textMuted }}
              >
                {t("reviewsCount", { count: config.ratings.count })}
              </span>
            </div>

            <div className="flex items-start gap-6 mb-6">
              <div
                className="w-20 h-20 md:w-24 md:h-24 shrink-0 border flex items-center justify-center text-2xl md:text-3xl font-bold"
                style={{ borderColor: C.borderLight }}
              >
                {loc(config.name, locale)
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-bold leading-none tracking-tighter uppercase">
                  {loc(config.name, locale)}
                </h1>
                <p
                  className="text-base leading-relaxed uppercase mt-4 max-w-xl"
                  style={{ color: C.textMuted }}
                >
                  {loc(config.description, locale)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── RATINGS ── */}
      <section className="border-b" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid md:grid-cols-[1fr_auto] gap-10">
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-6"
                style={{ color: C.accent }}
              >
                {t("ratings")}
              </div>
              <div className="space-y-3 max-w-md">
                <RatingBar label={t("overall")} value={config.ratings.overall} />
                <RatingBar label={t("clarityLabel")} value={config.ratings.clarity} />
                <RatingBar label={t("difficultyLabel")} value={config.ratings.difficulty} />
                <RatingBar label={t("usefulness")} value={config.ratings.usefulness} />
              </div>
            </div>
            <div
              className="border self-start px-8 py-6 text-center"
              style={{ borderColor: C.borderLight }}
            >
              <div className="text-5xl font-bold tabular-nums">
                {config.ratings.overall}
              </div>
              <div
                className="text-[11px] uppercase tracking-wider mt-1"
                style={{ color: C.textMuted }}
              >
                {t("outOf5")}
              </div>
              <div className="mt-2">
                <Stars rating={config.ratings.overall} />
              </div>
              <div
                className="text-[11px] uppercase tracking-wider mt-2"
                style={{ color: C.textMuted }}
              >
                {t("reviewsCount", { count: config.ratings.count })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      {config.contacts && (
        <section className="border-b" style={{ borderColor: C.borderLight }}>
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-6"
              style={{ color: C.accent }}
            >
              {t("contact")}
            </div>
            <div className="border" style={{ borderColor: C.borderLight }}>
              {[
                config.contacts.email && {
                  label: t("emailLabel"),
                  value: config.contacts.email,
                },
                config.contacts.office && {
                  label: t("officeLabel"),
                  value: loc(config.contacts.office, locale),
                },
                config.contacts.website && {
                  label: t("websiteLabel"),
                  value: config.contacts.website,
                },
              ]
                .filter((x): x is { label: string; value: string } => Boolean(x))
                .map((item, i, arr) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 px-4 py-3"
                    style={{
                      borderBottom:
                        i < arr.length - 1
                          ? `1px solid ${C.borderLight}`
                          : "none",
                    }}
                  >
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider w-20 shrink-0"
                      style={{ color: C.textMuted }}
                    >
                      {item.label}
                    </span>
                    <span className="text-base uppercase">{item.value}</span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SUBJECTS ── */}
      {teacher.resolvedSubjects.length > 0 && (
        <section className="border-b" style={{ borderColor: C.borderLight }}>
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-6"
              style={{ color: C.accent }}
            >
              {tEntity("subjectsTaught")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {teacher.resolvedSubjects.map((sub) => {
                const theme = getSubjectTheme(sub.slug);
                return (
                  <Link
                    key={sub.slug}
                    href={`/${sub.slug}`}
                    className="border p-4 group transition-colors flex items-center gap-3"
                    style={{ borderColor: C.borderLight }}
                  >
                    <span className="text-lg" style={{ color: theme.accent }}>{theme.icon}</span>
                    <span className="text-sm font-bold uppercase group-hover:underline">
                      {loc(sub.name, locale)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── ARTICLES ── */}
      {articleEntries.length > 0 && (
        <section className="border-b" style={{ borderColor: C.borderLight }}>
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-6"
              style={{ color: C.accent }}
            >
              {t("articles")}
            </div>
            <div className="border" style={{ borderColor: C.borderLight }}>
              {articleEntries.map((article, i) => (
                <Link
                  key={article.slug}
                  href={`/${config.slug}/${article.slug}`}
                  className="flex items-center justify-between px-4 py-3 group transition-colors"
                  style={{
                    borderBottom:
                      i < articleEntries.length - 1
                        ? `1px solid ${C.borderLight}`
                        : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: C.textMuted }}>
                      ▸
                    </span>
                    <span className="text-base uppercase font-medium group-hover:underline">
                      {article.title}
                    </span>
                  </div>
                  {article.readTime && (
                    <span
                      className="text-[11px] uppercase shrink-0"
                      style={{ color: C.textMuted }}
                    >
                      {t("min", { minutes: article.readTime })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── REVIEWS ── */}
      {config.reviews && config.reviews.length > 0 && (
        <section>
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between mb-6">
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: C.accent }}
              >
                {tEntity("studentReviews")}
              </div>
              <div
                className="text-[11px] uppercase tracking-wider"
                style={{ color: C.textMuted }}
              >
                {t("reviewsOf", { count: config.reviews.length, total: config.ratings.count })}
              </div>
            </div>

            <div className="space-y-3">
              {config.reviews.map((review, i) => (
                <motion.div
                  key={i}
                  className="border p-4"
                  style={{ borderColor: C.borderLight }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Stars rating={review.rating} />
                      <span className="text-sm font-bold tabular-nums">
                        {review.rating}/5
                      </span>
                    </div>
                    <span
                      className="text-[11px] uppercase tabular-nums"
                      style={{ color: C.textMuted }}
                    >
                      {review.date}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: C.textMuted }}
                  >
                    &ldquo;{loc(review.text, locale)}&rdquo;
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
