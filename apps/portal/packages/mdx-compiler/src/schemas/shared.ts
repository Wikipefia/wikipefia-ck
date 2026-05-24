/**
 * Shared Zod schemas used across all content types.
 */

import { z } from "zod/v4";

/** Localized string — required for all three locales. */
export const LocalizedString = z.object({
  ru: z.string(),
  en: z.string(),
  cz: z.string(),
});
export type LocalizedString = z.infer<typeof LocalizedString>;

/** Localized keyword arrays — required for all three locales. */
export const LocalizedKeywords = z.object({
  ru: z.array(z.string()),
  en: z.array(z.string()),
  cz: z.array(z.string()),
});
export type LocalizedKeywords = z.infer<typeof LocalizedKeywords>;

/** Supported locales. */
export const LOCALES = ["ru", "en", "cz"] as const;
export type Locale = (typeof LOCALES)[number];
