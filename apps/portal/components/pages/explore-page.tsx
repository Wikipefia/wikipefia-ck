"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { C, getSubjectTheme } from "@/lib/theme";
import { PageShell } from "@/components/shared/page-shell";
import type {
  ExploreData,
  ExploreSubject,
  ExploreTeacher,
  ExploreSystemArticle,
} from "@/app/explore/page";

/* ── Tab types ── */
type Tab = "all" | "subjects" | "faculty" | "articles" | "system";

/* ── Locale pills ── */
function LocalePills({ locales }: { locales: string[] }) {
  return (
    <div className="flex gap-1">
      {locales.map((l) => (
        <span
          key={l}
          className="text-[9px] font-bold uppercase px-1 py-px border"
          style={{ borderColor: C.borderLight, color: C.textMuted }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({
  label,
  count,
  id,
}: {
  label: string;
  count: number;
  id?: string;
}) {
  return (
    <div id={id} className="flex items-center justify-between mb-6 scroll-mt-24">
      <div
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color: C.accent }}
      >
        {label}
      </div>
      <div
        className="text-[11px] uppercase tracking-wider tabular-nums"
        style={{ color: C.textMuted }}
      >
        {count}
      </div>
    </div>
  );
}

/* ── Expandable subject row ── */
function SubjectRow({ sub, idx }: { sub: ExploreSubject; idx: number }) {
  const [open, setOpen] = useState(false);
  const theme = getSubjectTheme(sub.slug);
  const t = useTranslations("common");

  return (
    <motion.div
      className="border"
      style={{ borderColor: C.borderLight }}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.04 }}
    >
      {/* Header row */}
      <div
        className="grid grid-cols-[1fr_auto] items-center cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Link
          href={`/${sub.slug}`}
          className="px-4 py-4 group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg" style={{ color: theme.accent }}>{theme.icon}</span>
            <span className="text-base font-bold uppercase group-hover:underline">{sub.name}</span>
          </div>
          <p
            className="text-[12px] uppercase"
            style={{ color: C.textMuted }}
          >
            {sub.description}
          </p>
        </Link>
        <div className="px-4 flex items-center gap-6 shrink-0">
          <div className="hidden md:flex items-center gap-4 text-[11px] uppercase" style={{ color: C.textMuted }}>
            <span>S{sub.semester}</span>
            <span>{sub.credits} ECTS</span>
            <span>{sub.department}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] tabular-nums" style={{ color: C.textMuted }}>
              {t("articlesCount", { count: sub.articles.length })}
            </span>
            <button
              className="w-6 h-6 flex items-center justify-center border text-[11px] font-bold cursor-pointer transition-transform"
              style={{
                borderColor: C.borderLight,
                transform: open ? "rotate(45deg)" : "rotate(0deg)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Expanded articles */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: `1px solid ${C.borderLight}` }}>
              {sub.articles.map((article, ai) => (
                <Link
                  key={article.slug}
                  href={`/${sub.slug}/${article.slug}`}
                  className="flex items-center justify-between px-4 py-2.5 pl-8 group"
                  style={{
                    borderBottom:
                      ai < sub.articles.length - 1
                        ? `1px solid ${C.borderLight}`
                        : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: theme.accent }}>
                      ▸
                    </span>
                    <span className="text-sm uppercase group-hover:underline">{article.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <LocalePills locales={article.locales} />
                    {article.readTime && (
                      <span className="text-[11px]" style={{ color: C.textMuted }}>
                        {article.readTime}m
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {sub.teachers.length > 0 && (
                <div
                  className="px-4 py-2 pl-8 text-[11px] uppercase"
                  style={{
                    borderTop: `1px solid ${C.borderLight}`,
                    color: C.textMuted,
                  }}
                >
                  {t("facultyColon")} {sub.teachers.join(" · ")}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Teacher row ── */
function TeacherRow({ t: teacher, idx }: { t: ExploreTeacher; idx: number }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("common");

  return (
    <motion.div
      className="border"
      style={{ borderColor: C.borderLight }}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.04 }}
    >
      <div
        className="grid grid-cols-[1fr_auto] items-center cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Link
          href={`/${teacher.slug}`}
          className="px-4 py-4 group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-base font-bold uppercase group-hover:underline">{teacher.name}</span>
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: C.accent }}
            >
              {teacher.ratings.overall}/5.0
            </span>
          </div>
          <p className="text-[12px] uppercase" style={{ color: C.textMuted }}>
            {teacher.description}
          </p>
        </Link>
        <div className="px-4 flex items-center gap-4 shrink-0">
          <div className="hidden md:flex gap-3 text-[11px] uppercase tabular-nums" style={{ color: C.textMuted }}>
            <span>{t("clarityLabel")} {teacher.ratings.clarity}</span>
            <span>{t("usefulness")} {teacher.ratings.usefulness}</span>
            <span>{t("reviewsCount", { count: teacher.ratings.count })}</span>
          </div>
          {teacher.articles.length > 0 && (
            <button
              className="w-6 h-6 flex items-center justify-center border text-[11px] font-bold cursor-pointer transition-transform"
              style={{
                borderColor: C.borderLight,
                transform: open ? "rotate(45deg)" : "rotate(0deg)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              +
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && teacher.articles.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: `1px solid ${C.borderLight}` }}>
              {teacher.articles.map((article, ai) => (
                <Link
                  key={article.slug}
                  href={`/${teacher.slug}/${article.slug}`}
                  className="flex items-center justify-between px-4 py-2.5 pl-8 group"
                  style={{
                    borderBottom:
                      ai < teacher.articles.length - 1
                        ? `1px solid ${C.borderLight}`
                        : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: C.textMuted }}>
                      ▸
                    </span>
                    <span className="text-sm uppercase group-hover:underline">{article.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <LocalePills locales={article.locales} />
                  </div>
                </Link>
              ))}
              {teacher.subjects.length > 0 && (
                <div
                  className="px-4 py-2 pl-8 text-[11px] uppercase"
                  style={{
                    borderTop: `1px solid ${C.borderLight}`,
                    color: C.textMuted,
                  }}
                >
                  {t("teaches")} {teacher.subjects.join(" · ")}
                </div>
              )}
              {teacher.contact && (
                <div
                  className="px-4 py-2 pl-8 text-[11px] uppercase"
                  style={{
                    borderTop: `1px solid ${C.borderLight}`,
                    color: C.textMuted,
                  }}
                >
                  {teacher.contact.email && <span>{teacher.contact.email}</span>}
                  {teacher.contact.office && <span className="ml-4">{teacher.contact.office}</span>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── All articles flat list ── */
function AllArticlesTable({
  subjects,
  teachers,
}: {
  subjects: ExploreSubject[];
  teachers: ExploreTeacher[];
}) {
  const t = useTranslations("common");
  const allArticles = [
    ...subjects.flatMap((s) => {
      const theme = getSubjectTheme(s.slug);
      return s.articles.map((a) => ({
        ...a,
        parentName: s.name,
        parentType: "subject" as const,
        accentColor: theme.accent,
      }));
    }),
    ...teachers.flatMap((t) =>
      t.articles.map((a) => ({
        ...a,
        parentName: t.name,
        parentType: "teacher" as const,
        accentColor: C.accent,
      }))
    ),
  ];

  return (
    <div className="border" style={{ borderColor: C.borderLight }}>
      <div
        className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: C.headerBg, color: C.headerText }}
      >
        <span>{t("title")}</span>
        <span className="text-right w-24 hidden md:block">{t("parent")}</span>
        <span className="text-right w-12">{t("time")}</span>
        <span className="text-right w-16">{t("lang")}</span>
      </div>
      {allArticles.map((a, i) => (
        <Link
          key={`${a.parentSlug}/${a.slug}`}
          href={`/${a.parentSlug}/${a.slug}`}
          className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center group"
          style={{
            borderBottom:
              i < allArticles.length - 1
                ? `1px solid ${C.borderLight}`
                : "none",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm uppercase truncate group-hover:underline">{a.title}</span>
          </div>
          <span
            className="text-[11px] uppercase text-right w-24 truncate hidden md:block"
            style={{ color: C.textMuted }}
          >
            {a.parentName}
          </span>
          <span
            className="text-[11px] tabular-nums text-right w-12"
            style={{ color: C.textMuted }}
          >
            {a.readTime ? `${a.readTime}m` : "—"}
          </span>
          <div className="flex justify-end w-16">
            <LocalePills locales={a.locales} />
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Main component ── */
export function ExplorePage({
  data,
  locale,
}: {
  data: ExploreData;
  locale: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const { subjects, teachers, systemArticles, buildTime, buildHash } = data;
  const t = useTranslations("common");
  const tEntity = useTranslations("entity");
  
  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "subjects", label: t("subjectsLabel") },
    { id: "faculty", label: t("facultyLabel") },
    { id: "articles", label: t("articlesLabel") },
    { id: "system", label: t("system") },
  ];

  const totalArticles =
    subjects.reduce((acc, s) => acc + s.articles.length, 0) +
    teachers.reduce((acc, t) => acc + t.articles.length, 0);

  const show = (tab: Tab) => activeTab === "all" || activeTab === tab;

  return (
    <PageShell
      breadcrumbs={[
        { label: t("home"), href: "/" },
        { label: t("exploreLabel") },
      ]}
      locale={locale}
    >
      {/* ── HEADER ── */}
      <section className="border-b" style={{ borderColor: C.borderLight }}>
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider"
                    style={{ backgroundColor: C.accent, color: "#fff" }}
                  >
                    {t("fullIndex")}
                  </span>
                  <span
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: C.textMuted }}
                  >
                    {buildHash.slice(0, 8)}
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold leading-none tracking-tighter uppercase">
                  {t("exploreLabel").toUpperCase()}
                </h1>
                <p
                  className="text-base uppercase mt-3 max-w-lg"
                  style={{ color: C.textMuted }}
                >
                  {t("fullIndexDescription")}
                </p>
              </div>

              {/* Stats block — wider */}
              <div className="border shrink-0 w-64" style={{ borderColor: C.borderLight }}>
                <div
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: C.headerBg, color: C.headerText }}
                >
                  {t("manifest")}
                </div>
                {[
                  { k: t("subjectsLabel"), v: subjects.length },
                  { k: t("facultyLabel"), v: teachers.length },
                  { k: t("articlesLabel"), v: totalArticles },
                  { k: t("system"), v: systemArticles.length },
                ].map((row, i) => (
                  <div
                    key={row.k}
                    className="px-4 py-2 flex items-center justify-between text-[11px]"
                    style={{
                      borderBottom: i < 3 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <span className="uppercase tracking-wider" style={{ color: C.textMuted }}>{row.k}</span>
                    <span className="font-bold tabular-nums">{row.v}</span>
                  </div>
                ))}
                <div
                  className="px-4 py-2 text-[10px] uppercase"
                  style={{
                    borderTop: `1px solid ${C.borderLight}`,
                    color: C.textMuted,
                  }}
                >
                  {new Date(buildTime).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TAB BAR ── */}
      <section
        className="border-b sticky top-14 z-30"
        style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                style={{
                  backgroundColor:
                    activeTab === tab.id ? C.headerBg : "transparent",
                  color: activeTab === tab.id ? C.headerText : C.textMuted,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* Subjects */}
        {show("subjects") && (
          <section>
            <SectionHeader
              label={t("subjects")}
              count={subjects.length}
              id="subjects"
            />
            <div className="space-y-3">
              {subjects.map((sub, i) => (
                <SubjectRow key={sub.slug} sub={sub} idx={i} />
              ))}
            </div>
          </section>
        )}

        {/* Faculty */}
        {show("faculty") && (
          <section>
            <SectionHeader
              label={tEntity("faculty")}
              count={teachers.length}
              id="faculty"
            />
            <div className="space-y-3">
              {teachers.map((t, i) => (
                <TeacherRow key={t.slug} t={t} idx={i} />
              ))}
            </div>
          </section>
        )}

        {/* All articles flat table */}
        {show("articles") && (
          <section>
            <SectionHeader
              label={t("allArticles")}
              count={totalArticles}
              id="articles"
            />
            <AllArticlesTable subjects={subjects} teachers={teachers} />
          </section>
        )}

        {/* System articles */}
        {show("system") && (
          <section>
            <SectionHeader
              label={t("allArticles")}
              count={systemArticles.length}
              id="system"
            />
            <div className="border" style={{ borderColor: C.borderLight }}>
              <div
                className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: C.headerBg, color: C.headerText }}
              >
                <span>{t("title")}</span>
                <span className="text-right w-16">{t("pinned")}</span>
                <span className="text-right w-16">{t("lang")}</span>
              </div>
              {systemArticles.map((sa, i) => (
                <Link
                  key={sa.slug}
                  href={sa.route}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center group"
                  style={{
                    borderBottom:
                      i < systemArticles.length - 1
                        ? `1px solid ${C.borderLight}`
                        : "none",
                  }}
                >
                  <div>
                    <span className="text-sm font-bold uppercase group-hover:underline">
                      {sa.name}
                    </span>
                    {sa.description && (
                      <p
                        className="text-[12px] uppercase mt-0.5"
                        style={{ color: C.textMuted }}
                      >
                        {sa.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right w-16">
                    {sa.pinned && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 border"
                        style={{ borderColor: C.accent, color: C.accent }}
                      >
                        {t("pinned")}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end w-16">
                    <LocalePills locales={sa.locales} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
