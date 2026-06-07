import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Admin key/value settings (see the `settings` table in schema.ts).
 *
 * Thin CRUD over a namespaced key/value store. The admin app's AI section
 * (service flags, prompt overrides, API key metadata) builds on this; readers
 * elsewhere should fall back to env/code defaults when a key is absent.
 */

// ── Public queries ──

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("settings").collect();
  },
});

// ── Public mutations ──

export const set = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("settings", {
      key,
      value,
      updatedAt: Date.now(),
    });
  },
});
