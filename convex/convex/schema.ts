import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    githubRepo: v.string(),
    branch: v.string(),
    type: v.union(
      v.literal("subject"),
      v.literal("teacher"),
      v.literal("system"),
    ),
    configJson: v.optional(v.any()),
    cachedTree: v.optional(
      v.array(
        v.object({
          path: v.string(),
          type: v.string(),
          sha: v.string(),
          size: v.optional(v.number()),
        }),
      ),
    ),
    lastSynced: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_type", ["type"])
    .index("by_github_repo", ["githubRepo"]),
});
