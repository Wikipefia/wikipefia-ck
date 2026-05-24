/**
 * Teacher config.json schema.
 */

import { z } from "zod/v4";
import { LocalizedString, LocalizedKeywords } from "./shared.js";

export const TeacherConfig = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: LocalizedString,
  description: LocalizedString,
  photo: z.string().optional(),
  subjects: z.array(z.string()),
  ratings: z.object({
    overall: z.number().min(0).max(5),
    clarity: z.number().min(0).max(5),
    difficulty: z.number().min(0).max(5),
    usefulness: z.number().min(0).max(5),
    count: z.number().int().min(0),
  }),
  keywords: LocalizedKeywords,
  contacts: z
    .object({
      email: z.string().email().optional(),
      office: LocalizedString.optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  reviews: z
    .array(
      z.object({
        text: LocalizedString,
        rating: z.number().min(1).max(5),
        date: z.string(),
        anonymous: z.boolean().default(true),
      })
    )
    .optional(),
  sections: z
    .array(
      z.object({
        slug: z.string(),
        name: LocalizedString,
        articles: z.array(z.string()),
      })
    )
    .optional(),
});

export type TeacherConfig = z.infer<typeof TeacherConfig>;
