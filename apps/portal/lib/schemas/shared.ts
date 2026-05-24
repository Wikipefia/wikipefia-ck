import { z } from "zod/v4";

export const locales = ["ru", "en", "cz"] as const;
export type Locale = (typeof locales)[number];

export const LocalizedString = z.object({
  ru: z.string(),
  en: z.string(),
  cz: z.string(),
});

export type LocalizedStringType = z.infer<typeof LocalizedString>;

export const LocalizedKeywords = z.object({
  ru: z.array(z.string()),
  en: z.array(z.string()),
  cz: z.array(z.string()),
});

export type LocalizedKeywordsType = z.infer<typeof LocalizedKeywords>;
