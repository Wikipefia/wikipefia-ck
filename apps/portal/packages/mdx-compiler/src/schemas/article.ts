/**
 * Article frontmatter schema — validated for every MDX file.
 */

import { z } from "zod/v4";
import { LocalizedString, LocalizedKeywords } from "./shared.js";

export const ArticleFrontmatter = z.object({
  title: LocalizedString,
  slug: z.string().regex(/^[a-z0-9_-]+$/),
  author: z.string().optional(),
  keywords: LocalizedKeywords,
  created: z.string(),
  updated: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimatedReadTime: z.number().optional(),
  prerequisites: z.array(z.string()).optional(),
  tutors: z.array(z.string()).optional(),
});

export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatter>;
