import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

// ── Public queries ──

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ── Public mutations ──

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error(`Project "${args.slug}" already exists`);
    return await ctx.db.insert("projects", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    branch: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("subject"),
        v.literal("teacher"),
        v.literal("system"),
      ),
    ),
  },
  handler: async (ctx, { id, name, description, githubRepo, branch, type }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Project not found");
    // Only patch the fields that were provided. Spreading `undefined`
    // checks keeps required fields from being dropped (patching a field to
    // `undefined` would delete it).
    await ctx.db.patch(id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(githubRepo !== undefined && { githubRepo }),
      ...(branch !== undefined && { branch }),
      ...(type !== undefined && { type }),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Project not found");
    await ctx.db.delete(id);
  },
});

// ── Internal (used by actions) ──

export const getBySlugInternal = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const getByGithubRepo = internalQuery({
  args: { githubRepo: v.string() },
  handler: async (ctx, { githubRepo }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_github_repo", (q) => q.eq("githubRepo", githubRepo))
      .first();
  },
});

export const upsertFromGithub = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_github_repo", (q) => q.eq("githubRepo", args.githubRepo))
      .first();

    if (existing) {
      // Update name/description/config if re-discovered
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        configJson: args.configJson,
        slug: args.slug,
      });
      return existing._id;
    }

    return await ctx.db.insert("projects", args);
  },
});

export const updateProjectCache = internalMutation({
  args: {
    id: v.id("projects"),
    configJson: v.any(),
    cachedTree: v.array(
      v.object({
        path: v.string(),
        type: v.string(),
        sha: v.string(),
        size: v.optional(v.number()),
      }),
    ),
    lastSynced: v.number(),
  },
  handler: async (ctx, { id, configJson, cachedTree, lastSynced }) => {
    await ctx.db.patch(id, { configJson, cachedTree, lastSynced });
  },
});
