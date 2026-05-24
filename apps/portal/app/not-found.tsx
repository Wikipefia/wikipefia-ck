import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/shared/page-shell";
import { C } from "@/lib/theme";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <PageShell breadcrumbs={[{ label: t("home"), href: "/" }, { label: "404" }]} locale="ru">
      <div className="max-w-7xl mx-auto px-4 py-24 md:py-32">
        <div className="max-w-lg">
          <div
            className="text-[11px] font-bold uppercase tracking-wider mb-6"
            style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
          >
            {t("error")}
          </div>
          <h1
            className="text-8xl md:text-[140px] font-bold leading-none tracking-tighter"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            404
          </h1>
          <div
            className="mt-6 mb-8"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <p
              className="text-base uppercase mb-2"
            >
              {t("pageNotFound")}
            </p>
            <p
              className="text-sm uppercase leading-relaxed"
              style={{ color: C.textMuted }}
            >
              {t("pageNotFoundDescription")}
            </p>
          </div>
          <div
            className="flex gap-3"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Link
              href="/"
              className="border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors hover:underline"
              style={{ borderColor: C.borderLight }}
            >
              ← {t("home")}
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
