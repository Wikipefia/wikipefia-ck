import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PageShell } from "@/components/shared/page-shell";
import { SubjectFront } from "@/components/pages/subject-front";
import { TeacherFront } from "@/components/pages/teacher-front";
import { getManifest, getCompiledMDX, getTableOfContents } from "@/lib/content/loader";
import { localized, resolveLocale } from "@/lib/i18n/helpers";
import { MDXRenderer } from "@/lib/mdx/renderer";
import { C } from "@/lib/theme";
import type { Locale } from "@/lib/i18n/config";

interface Props {
  params: Promise<{ entitySlug: string }>;
}

export async function generateStaticParams() {
  try {
    const manifest = await getManifest();
    return Object.keys(manifest.routeMap).map((slug) => ({
      entitySlug: slug,
    }));
  } catch {
    // Fallback for dev without content build
    return [];
  }
}

export default async function EntityPage({ params }: Props) {
  const { entitySlug } = await params;
  const locale = (await getLocale()) as Locale;

  let manifest;
  try {
    manifest = await getManifest();
  } catch {
    notFound();
  }

  const entityInfo = manifest.routeMap[entitySlug];
  if (!entityInfo) notFound();

  if (entityInfo.type === "subject") {
    const subject = manifest.subjects[entitySlug];
    if (!subject) notFound();

    // Load _front article MDX if it exists
    const frontArticle = subject.articles["_front"];
    let frontMdxContent: React.ReactNode = null;
    if (frontArticle) {
      try {
        const effectiveLocale = resolveLocale(frontArticle.locales, locale);
        const compiledSource = await getCompiledMDX(frontArticle.compiledPath, effectiveLocale);
        frontMdxContent = <MDXRenderer compiledSource={compiledSource} />;
      } catch {
        // _front article not available, that's fine
      }
    }

    return (
      <PageShell
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: localized(subject.config.name, locale) },
        ]}
        locale={locale}
      >
        <SubjectFront
          subject={subject}
          locale={locale}
        >
          {frontMdxContent}
        </SubjectFront>
      </PageShell>
    );
  }

  if (entityInfo.type === "teacher") {
    const teacher = manifest.teachers[entitySlug];
    if (!teacher) notFound();

    return (
      <PageShell
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: localized(teacher.config.name, locale) },
        ]}
        locale={locale}
      >
        <TeacherFront teacher={teacher} locale={locale} />
      </PageShell>
    );
  }

  if (entityInfo.type === "system-article") {
    const sysArticle = manifest.systemArticles[entitySlug];
    if (!sysArticle) notFound();

    const effectiveLocale = resolveLocale(sysArticle.locales, locale);
    let compiledSource: string | null = null;
    try {
      compiledSource = await getCompiledMDX(sysArticle.compiledPath, effectiveLocale);
    } catch {
      notFound();
    }

    return (
      <PageShell
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: localized(sysArticle.config.name, locale) },
        ]}
        locale={locale}
      >
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8">
            <span
              className="text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider"
              style={{ backgroundColor: C.accent, color: "#fff" }}
            >
              System Article
            </span>
            <h1
              className="text-3xl md:text-5xl font-bold leading-tight tracking-tighter uppercase mt-4"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {localized(sysArticle.config.name, locale)}
            </h1>
            {sysArticle.config.description && (
              <p
                className="text-base uppercase mt-4"
                style={{ color: C.textMuted }}
              >
                {localized(sysArticle.config.description, locale)}
              </p>
            )}
          </div>
          {/* Single divider — content follows directly */}
          <div className="prose-wiki">
            {compiledSource && (
              <MDXRenderer compiledSource={compiledSource} />
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  notFound();
}
