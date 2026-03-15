import { z } from "zod/v4";
import { LocalizedString, LocalizedKeywords } from "./shared";

export const ArticleFrontmatter = z.object({
  title: LocalizedString,
  slug: z.string().regex(/^[a-z0-9_-]+$/),
  author: z.string().optional(), // teacher slug
  keywords: LocalizedKeywords,
  created: z.string(), // ISO date
  updated: z.string().optional(), // ISO date
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimatedReadTime: z.number().optional(), // minutes
  prerequisites: z.array(z.string()).optional(), // other article slugs
  tutors: z.array(z.string()).optional(), // teacher slugs who can tutor this
});

export type ArticleFrontmatterType = z.infer<typeof ArticleFrontmatter>;
