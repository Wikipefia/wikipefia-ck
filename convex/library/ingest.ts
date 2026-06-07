import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { documentTypeValidator } from "./files";

/** Hosts the ingest action is allowed to fetch from (UploadThing CDN only). */
const ALLOWED_UPLOAD_HOSTS = ["utfs.io", "ufs.sh"];

/** Hard cap on ingested bytes — mirrors the UploadThing route's per-file limit. */
const MAX_INGEST_BYTES = 256 * 1024 * 1024;

/** True only for `https://` URLs whose host is (a subdomain of) an allowed host. */
function isAllowedUploadUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_UPLOAD_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

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
 * SECURITY (v1): this is a PUBLIC action with no auth. To limit the blast
 * radius of that open surface we (a) only fetch from allowlisted UploadThing
 * hosts over HTTPS — preventing it from being used as an SSRF/proxy — and
 * (b) cap the ingested size. A shared-secret/signature from the callback can be
 * layered on later for full authentication.
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
    // 1. Only fetch from allowlisted UploadThing hosts (anti-SSRF).
    if (!isAllowedUploadUrl(args.utUrl)) {
      throw new Error("Upload URL is not an allowed UploadThing host");
    }

    // 2. Validate the subject BEFORE storing any bytes, so a bad subject id
    //    can't leave an orphaned blob in `_storage`.
    const subject = await ctx.runQuery(
      internal.library.subjects.getByIdInternal,
      { subjectId: args.subjectId },
    );
    if (!subject) throw new Error("Subject not found");

    // 3. Pull the bytes from UploadThing, enforcing the size cap.
    const response = await fetch(args.utUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch upload from UploadThing: ${response.status}`,
      );
    }
    const blob = await response.blob();
    if (blob.size > MAX_INGEST_BYTES) {
      throw new Error("Upload exceeds the maximum ingest size");
    }

    // 4. Store permanently, then create the row. If the create fails, delete
    //    the just-stored blob so we don't leak unreferenced storage.
    const storageId = await ctx.storage.store(blob);
    try {
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
    } catch (err) {
      await ctx.storage.delete(storageId);
      throw err;
    }
  },
});
