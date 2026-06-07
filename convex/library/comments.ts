import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

/**
 * Threaded comments on library files. Replies reference a `parentCommentId`;
 * the tree is assembled client-side from the flat list. Deletes are soft
 * (`deletedAt`) so a deleted comment's replies keep their place in the thread.
 */

/** All comments for a file (flat; UI builds the reply tree). */
export const list = query({
  args: { fileId: v.id("libraryFiles") },
  handler: async (ctx, { fileId }) => {
    // CAP: 500 comments per file surfaced in v1.
    return await ctx.db
      .query("libraryComments")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .take(500);
  },
});

/** Add a top-level comment or a reply (when `parentCommentId` is given). */
export const add = mutation({
  args: {
    fileId: v.id("libraryFiles"),
    parentCommentId: v.optional(v.id("libraryComments")),
    body: v.string(),
  },
  handler: async (ctx, { fileId, parentCommentId, body }) => {
    const trimmed = body.trim();
    if (!trimmed) throw new Error("Comment body is empty");

    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");

    if (parentCommentId) {
      const parent = await ctx.db.get(parentCommentId);
      if (!parent || parent.fileId !== fileId) {
        throw new Error("Parent comment not found on this file");
      }
    }

    return await ctx.db.insert("libraryComments", {
      fileId,
      parentCommentId,
      body: trimmed,
    });
  },
});

/** Soft-delete a comment (preserves its replies' position in the thread). */
export const remove = mutation({
  args: { commentId: v.id("libraryComments") },
  handler: async (ctx, { commentId }) => {
    const comment = await ctx.db.get(commentId);
    if (!comment) return { ok: true };
    await ctx.db.patch(commentId, { deletedAt: Date.now() });
    return { ok: true };
  },
});
