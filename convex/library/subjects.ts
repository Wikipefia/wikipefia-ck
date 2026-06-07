import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";

/**
 * Subjects available to categorize library files. The library does NOT manage
 * subjects — it only references existing `projects` rows of `type === "subject"`.
 */

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Bounded read: take(200) — there are far fewer subjects than that, but we
    // cap to stay within the "bounded collection" guideline.
    return await ctx.db
      .query("projects")
      .withIndex("by_type", (q) => q.eq("type", "subject"))
      .take(200);
  },
});

/** Internal: resolve a subject by id (used by the ingest action for its slug). */
export const getByIdInternal = internalQuery({
  args: { subjectId: v.id("projects") },
  handler: async (ctx, { subjectId }) => {
    return await ctx.db.get(subjectId);
  },
});
