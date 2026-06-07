import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { documentTypeValidator } from "./files";

/**
 * Ingest a freshly-uploaded file from UploadThing (temporary CDN) into Convex
 * Storage (the permanent home), then create its `libraryFiles` row + tags.
 *
 * Flow (called from the Next.js UploadThing `onUploadComplete` callback):
 *   1. fetch(utUrl) → blob
 *   2. storageId = ctx.storage.store(blob)
 *   3. resolve subject slug
 *   4. runMutation(internal.library.files.create, {...})
 *   5. return { fileId }
 * The caller then deletes the UploadThing copy.
 *
 * Runs in the DEFAULT Convex runtime — both `fetch` and `ctx.storage` work
 * there, so no `"use node"` is needed.
 *
 * SECURITY (v1): this is a PUBLIC action with no auth — an open surface called
 * from the upload callback. A shared-secret check can be layered on later.
 */
export const ingestFromUploadThing = action({
  args: {
    utUrl: v.string(),
    originalName: v.string(),
    contentType: v.string(),
    size: v.number(),
    subjectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    documentType: v.optional(documentTypeValidator),
    language: v.optional(v.string()),
    year: v.optional(v.number()),
    authorName: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    customFields: v.optional(v.record(v.string(), v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ fileId: Id<"libraryFiles"> }> => {
    // 1–2. Pull the bytes from UploadThing and store them permanently.
    const response = await fetch(args.utUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch upload from UploadThing: ${response.status}`);
    }
    const blob = await response.blob();
    const storageId = await ctx.storage.store(blob);

    // 3. Resolve the subject slug for denormalized display.
    const subject = await ctx.runQuery(
      internal.library.subjects.getByIdInternal,
      { subjectId: args.subjectId },
    );
    if (!subject) throw new Error("Subject not found");

    // 4. Create the file row (+ tags) in a single mutation transaction.
    const fileId: Id<"libraryFiles"> = await ctx.runMutation(
      internal.library.files.create,
      {
        storageId,
        subjectId: args.subjectId,
        subjectSlug: subject.slug,
        originalName: args.originalName,
        title: args.title?.trim() || args.originalName,
        description: args.description,
        contentType: args.contentType,
        size: args.size,
        documentType: args.documentType ?? "other",
        language: args.language,
        year: args.year,
        authorName: args.authorName,
        sourceUrl: args.sourceUrl,
        pageCount: args.pageCount,
        customFields: args.customFields,
        tags: args.tags,
      },
    );

    return { fileId };
  },
});
