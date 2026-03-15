import type { Locale } from "./config";
import type { LocalizedStringType } from "@/lib/schemas";

/**
 * Resolve the best available locale from a list of available ones.
 * Fallback chain: requested → en → ru → first available.
 */
export function resolveLocale(
  availableLocales: Locale[],
  requested: string
): Locale {
  if (availableLocales.includes(requested as Locale))
    return requested as Locale;
  if (availableLocales.includes("en")) return "en";
  if (availableLocales.includes("ru")) return "ru";
  return availableLocales[0];
}

/**
 * Pick the localized string for a given locale, with fallback.
 */
export function localized(
  obj: LocalizedStringType,
  locale: string
): string {
  return (
    obj[locale as Locale] || obj.en || obj.ru
  );
}
