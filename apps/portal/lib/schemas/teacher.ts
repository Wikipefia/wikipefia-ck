import { z } from "zod/v4";
import { LocalizedString, LocalizedKeywords } from "./shared";

export const TeacherConfig = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: LocalizedString,
  description: LocalizedString,
  photo: z.string().optional(), // path relative to content/teachers/<slug>/
  subjects: z.array(z.string()), // subject slugs (refs)
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
        date: z.string(), // ISO date
        anonymous: z.boolean().default(true),
      })
    )
    .optional(),
  // Optional: organize teacher's articles into sections
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

export type TeacherConfigType = z.infer<typeof TeacherConfig>;
