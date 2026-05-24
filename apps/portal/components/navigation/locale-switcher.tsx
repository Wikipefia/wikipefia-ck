"use client";

import { C } from "@/lib/theme";

const LOCALE_LABELS: Record<string, string> = {
  ru: "RU",
  en: "EN",
  cz: "CZ",
};

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  function switchLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    window.location.reload();
  }

  return (
    <div className="flex border h-[34px]" style={{ borderColor: C.borderLight }}>
      {Object.entries(LOCALE_LABELS).map(([locale, label], i, arr) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className="px-2.5 text-[11px] font-bold cursor-pointer transition-colors flex items-center"
          style={{
            backgroundColor: locale === currentLocale ? C.headerBg : "transparent",
            color: locale === currentLocale ? C.headerText : C.textMuted,
            borderRight:
              i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
