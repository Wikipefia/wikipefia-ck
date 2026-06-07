import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
// `Id` is a type-only import (no runtime dataModel.js exists) — used to satisfy
// the Convex action's `v.id("projects")` arg type for `subjectId`.
import { DOCUMENT_TYPES } from "@/lib/metadata";

const f = createUploadthing();

/**
 * Zod schema for the upload metadata the client passes alongside the file.
 * Validated server-side before the upload is accepted.
 */
const metadataSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  language: z.string().optional(),
  year: z.number().int().optional(),
  authorName: z.string().optional(),
  sourceUrl: z.string().optional(),
  pageCount: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

/**
 * UploadThing file router. The single `libraryUploader` route accepts one file
 * of any type, carries structured metadata as `.input()`, and on completion
 * ingests the bytes into Convex Storage (the permanent home) before deleting
 * the temporary UploadThing copy.
 */
export const ourFileRouter = {
  libraryUploader: f({
    // Multiple files per batch — and archives are expanded client-side into
    // their individual entries before upload, so a single .zip can fan out
    // into many of these slots. Each completed file becomes its own material.
    blob: { maxFileSize: "256MB", maxFileCount: 50 },
  })
    .input(metadataSchema)
    // Pass the validated input through to onUploadComplete as `metadata`.
    .middleware(async ({ input }) => {
      return { meta: input };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
      }
      const convex = new ConvexHttpClient(convexUrl);
      const meta = metadata.meta;

      // Ingest into Convex Storage + create the libraryFiles row (+ tags).
      const { fileId } = await convex.action(
        api.library.ingest.ingestFromUploadThing,
        {
          utUrl: file.ufsUrl,
          originalName: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          subjectId: meta.subjectId as Id<"projects">,
          title: meta.title,
          description: meta.description,
          documentType: meta.documentType,
          language: meta.language,
          year: meta.year,
          authorName: meta.authorName,
          sourceUrl: meta.sourceUrl,
          pageCount: meta.pageCount,
          tags: meta.tags,
          customFields: meta.customFields,
        },
      );

      // The bytes now live in Convex Storage — drop the temporary UT copy.
      await new UTApi().deleteFiles(file.key);

      // Returned to the client's onClientUploadComplete callback.
      return { fileId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
