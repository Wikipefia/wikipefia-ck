"use client";

import { Button, cn } from "@wikipefia/ui";

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

  const entries = Object.entries(LOCALE_LABELS);

  return (
    <div className="flex h-[34px] border border-line-soft">
      {entries.map(([locale, label], i) => {
        const active = locale === currentLocale;
        return (
          <Button
            key={locale}
            onClick={() => switchLocale(locale)}
            variant={active ? "primary" : "ghost"}
            className={cn(
              "h-full border-0 px-2.5 tracking-normal",
              !active && "text-muted",
              i < entries.length - 1 && "border-r border-line-soft",
            )}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
