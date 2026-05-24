import { z } from "zod/v4";
import { LocalizedString, LocalizedKeywords } from "./shared";

export const SystemArticleEntry = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  route: z.string().startsWith("/"), // explicit route from root
  name: LocalizedString,
  description: LocalizedString.optional(),
  keywords: LocalizedKeywords,
  pinned: z.boolean().default(false), // show on home page
  order: z.number().optional(), // sort priority
});

export type SystemArticleEntryType = z.infer<typeof SystemArticleEntry>;

export const SystemConfig = z.object({
  articles: z.array(SystemArticleEntry),
});

export type SystemConfigType = z.infer<typeof SystemConfig>;
