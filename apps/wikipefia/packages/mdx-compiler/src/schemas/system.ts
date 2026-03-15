/**
 * System config.json and article entry schemas.
 */

import { z } from "zod/v4";
import { LocalizedString, LocalizedKeywords } from "./shared.js";

export const SystemArticleEntry = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  route: z.string().startsWith("/"),
  name: LocalizedString,
  description: LocalizedString.optional(),
  keywords: LocalizedKeywords,
  pinned: z.boolean().default(false),
  order: z.number().optional(),
});

export type SystemArticleEntry = z.infer<typeof SystemArticleEntry>;

export const SystemConfig = z.object({
  articles: z.array(SystemArticleEntry),
});

export type SystemConfig = z.infer<typeof SystemConfig>;
