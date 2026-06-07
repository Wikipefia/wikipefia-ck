import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * 1–5 ratings on library files. Ratings are append-only events (no per-user
 * dedup in v1 — there's no user attribution yet). The file's denormalized
 * `ratingCount` / `ratingSum` are updated in the same transaction so the
 * average stays a cheap derived value.
 */

export const rate = mutation({
  args: {
    fileId: v.id("libraryFiles"),
    value: v.number(), // 1–5
  },
  handler: async (ctx, { fileId, value }) => {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error("Rating must be an integer from 1 to 5");
    }
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");

    await ctx.db.insert("libraryRatings", { fileId, value });
    await ctx.db.patch(fileId, {
      ratingCount: file.ratingCount + 1,
      ratingSum: file.ratingSum + value,
    });
    return { ok: true };
  },
});
