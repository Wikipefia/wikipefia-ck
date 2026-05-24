/**
 * Subject config.json schema.
 */

import { z } from "zod/v4";
import { LocalizedString, LocalizedKeywords } from "./shared.js";

export const SubjectConfig = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: LocalizedString,
  description: LocalizedString,
  teachers: z.array(z.string()),
  keywords: LocalizedKeywords,
  categories: z.array(
    z.object({
      slug: z.string(),
      name: LocalizedString,
      articles: z.array(z.string()),
    })
  ),
  metadata: z
    .object({
      semester: z.number().optional(),
      credits: z.number().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      department: LocalizedString.optional(),
    })
    .optional(),
});

export type SubjectConfig = z.infer<typeof SubjectConfig>;
