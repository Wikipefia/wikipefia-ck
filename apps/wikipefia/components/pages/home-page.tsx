"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { C, getSubjectTheme } from "@/lib/theme";
import { PageShell } from "@/components/shared/page-shell";
import { SearchDialog } from "@/components/search/search-dialog";

/* ── Types ── */
interface HomeSubject {
  slug: string;
  name: string;
  description: string;
  articleCount: number;
  difficulty: string;
  semester: number;
  credits: number;
}

interface HomeTeacher {
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
}

interface HomeSystemArticle {
  slug: string;
  name: string;
  description: string;
  route: string;
}

interface HomeData {
  subjects: HomeSubject[];
  teachers: HomeTeacher[];
  systemArticles: HomeSystemArticle[];
  fromManifest: boolean;
}

/* ── Animated counter ── */
function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 72;
    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [value]);
  return <span>{display}</span>;
}

/* ── Hero Search ── */
function HeroSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useTranslations("common");

  return (
    <>
      <div
        className="mt-8 max-w-lg cursor-text"
        onClick={() => setSearchOpen(true)}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border"
          style={{ borderColor: C.borderLight, backgroundColor: C.bgWhite }}
        >
          <span className="text-sm" style={{ color: C.textMuted }}>
            &gt;
          </span>
          <span
            className="text-sm uppercase"
            style={{ color: C.textMuted, opacity: 0.5 }}
          >
            {t("heroSearchPlaceholder")}
          </span>
          <span
            className="text-[10px] border px-1 py-px ml-auto"
            style={{ borderColor: C.borderLight, color: C.textMuted }}
          >
            ⌘K
          </span>
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

/* ── Home Page ── */
export function HomePage({ data, locale }: { data: HomeData; locale: string }) {
  const { subjects, teachers, systemArticles } = data;
  const t = useTranslations("common");
  const tHome = useTranslations("home");
  const tEntity = useTranslations("entity");

  const totalArticles = subjects.reduce((acc, s) => acc + s.articleCount, 0);

  return (
    <PageShell locale={locale}>
      {/* ── HERO ── */}
      <section className="border-b" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-[1fr_auto] gap-8 py-16 md:py-24">
            <div>
              <motion.h1
                className="text-6xl md:text-[100px] font-bold leading-none tracking-tighter uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                WIKI
                <br />
                <span style={{ color: C.accent }}>PEF</span>IA
              </motion.h1>
              <motion.div
                className="mt-6 max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <p
                  className="text-base leading-relaxed uppercase"
                  style={{ color: C.textMuted }}
                >
                  {t("learnAnything")}
                </p>
              </motion.div>

              {/* Search on homepage */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <HeroSearch />
              </motion.div>
            </div>

            <Link href="/explore">
              <motion.div
                className="border self-start cursor-pointer group w-72"
                style={{ borderColor: C.borderLight }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div
                  className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between"
                  style={{ backgroundColor: C.headerBg, color: C.headerText }}
                >
                  <span>{t("status")}</span>
                  <span className="opacity-50 group-hover:underline">
                    {t("explore")}
                  </span>
                </div>
                {[
                  { label: t("subjectsLabel"), val: subjects.length },
                  { label: t("articlesLabel"), val: totalArticles },
                  { label: t("facultyLabel"), val: teachers.length },
                  { label: t("localesLabel"), val: 3 },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="px-4 py-3 flex items-center justify-between"
                    style={{
                      borderBottom:
                        i < 3 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <span
                      className="text-[11px] uppercase tracking-wider"
                      style={{ color: C.textMuted }}
                    >
                      {s.label}
                    </span>
                    <span className="text-2xl font-bold tabular-nums">
                      <Counter value={s.val} />
                    </span>
                  </div>
                ))}
              </motion.div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURED / SYSTEM ARTICLES ── */}
      {systemArticles.length > 0 && (
        <section className="border-b" style={{ borderColor: C.borderLight }}>
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-6"
              style={{ color: C.accent }}
            >
              {t("featured")}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {systemArticles.map((item, i) => (
                <Link key={item.slug} href={item.route}>
                  <motion.div
                    className="p-6 border cursor-pointer group transition-colors"
                    style={{ borderColor: C.borderLight }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider"
                        style={{
                          backgroundColor: `${C.accent}`,
                          color: "#fff",
                        }}
                      >
                        {t("guide")}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold uppercase mb-2 group-hover:underline">
                      {item.name}
                    </h3>
                    <p className="text-sm uppercase opacity-50">
                      {item.description}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SUBJECTS ── */}
      <section className="border-b" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: C.accent }}
            >
              {tHome("featuredSubjects")}
            </div>
            <div
              className="text-[11px] uppercase tracking-wider"
              style={{ color: C.textMuted }}
            >
              {t("subjectsTotal", { count: subjects.length })}
            </div>
          </div>

          <div className="space-y-3">
            {subjects.map((sub, i) => {
              const theme = getSubjectTheme(sub.slug);
              return (
                <Link key={sub.slug} href={`/${sub.slug}`}>
                  <motion.div
                    className="border group cursor-pointer transition-colors flex items-stretch"
                    style={{ borderColor: C.borderLight }}
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {/* Color bar + icon */}
                    <div
                      className="w-14 shrink-0 flex items-center justify-center text-xl"
                      style={{
                        backgroundColor: `${theme.accent}15`,
                        color: theme.accent,
                      }}
                    >
                      {theme.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 px-4 py-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-base font-bold uppercase group-hover:underline">
                          {sub.name}
                        </span>
                        <p className="text-sm mt-1 opacity-50 uppercase">
                          {sub.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <span
                          className="text-sm tabular-nums hidden md:block"
                          style={{ color: C.textMuted }}
                        >
                          {t("semesterLabel", { number: sub.semester })}
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                          {t("articlesCount", { count: sub.articleCount })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TEACHERS ── */}
      <section>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div
            className="text-[11px] font-bold uppercase tracking-wider mb-6"
            style={{ color: C.accent }}
          >
            {tEntity("faculty")}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {teachers.map((teacher) => (
              <Link
                key={teacher.slug}
                href={`/${teacher.slug}`}
                className="border group cursor-pointer transition-colors block"
                style={{ borderColor: C.borderLight }}
              >
                <div
                  className="px-4 py-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider"
                  style={{ borderBottom: `1px solid ${C.borderLight}` }}
                >
                  <span className="group-hover:underline">{teacher.name}</span>
                  <span style={{ color: C.accent }}>
                    {teacher.ratings.overall}/5.0
                  </span>
                </div>
                <div className="px-4 py-4">
                  <p className="text-sm uppercase mb-3 opacity-50">
                    {teacher.description}
                  </p>
                  <div
                    className="flex gap-4 text-[11px] uppercase"
                    style={{ color: C.textMuted }}
                  >
                    <span>
                      {t("clarity")}{" "}
                      <span className="font-bold" style={{ color: C.text }}>
                        {teacher.ratings.clarity}
                      </span>
                    </span>
                    <span>
                      {t("useful")}{" "}
                      <span className="font-bold" style={{ color: C.text }}>
                        {teacher.ratings.usefulness}
                      </span>
                    </span>
                    <span>
                      {t("reviewsLabel")}{" "}
                      <span className="font-bold" style={{ color: C.text }}>
                        {teacher.ratings.count}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
