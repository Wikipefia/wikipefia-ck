import { v } from "convex/values";
import { mutation, internalQuery } from "../_generated/server";

/**
 * File upload helpers. Clients upload directly to Convex storage via a
 * presigned URL, then call sendMessage with `{storageId, ...metadata}`.
 *
 * The agent action reads files via ctx.storage.get inside Node and converts
 * them to AI SDK message parts.
 */

export const generateUploadUrl = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId: _userId }) => {
    // userId arg is taken to ensure callers always pass session — kept for
    // future per-user upload quota / cleanup hooks.
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Stub mutation kept for API surface compatibility with the chat package's
 * transport. Attachments flow through `sendMessage(attachments)` directly;
 * this hook is reserved for future per-attachment metadata edits.
 */
export const attachToMessage = mutation({
  args: {
    userId: v.string(),
    messageId: v.string(),
    storageId: v.string(),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (_ctx, args) => {
    return { ok: true, messageId: args.messageId };
  },
});

/**
 * Internal query: fetch storage URL for a stored attachment (used in agent
 * action when constructing AI SDK file message parts).
 */
export const getStorageUrl = internalQuery({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
