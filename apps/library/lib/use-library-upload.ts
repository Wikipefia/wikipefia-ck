"use client";

import { useCallback, useState } from "react";
import type { DocumentType } from "@/lib/metadata";
import { useUploadThing } from "@/lib/uploadthing";

/** Metadata passed alongside the file (matches the UploadThing input schema). */
export interface LibraryUploadMeta {
  subjectId: string;
  title?: string;
  description?: string;
  documentType?: DocumentType;
  language?: string;
  year?: number;
  authorName?: string;
  sourceUrl?: string;
  pageCount?: number;
  tags?: string[];
  customFields?: Record<string, string>;
}

export type UploadStatus =
  | "idle"
  | "uploading" // bytes streaming to UploadThing
  | "finalizing" // 100% sent; server ingesting into Convex Storage
  | "done"
  | "error";

/**
 * Shared upload state machine around `useUploadThing`. Exposes a 0–100
 * progress number and a coarse status so both the dialog button and the
 * subject-page drop banner can render the same flow.
 */
export function useLibraryUpload(onDone?: () => void) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("libraryUploader", {
    // "all" forwards the exact (fractional) percentage from each XHR progress
    // event. The default "coarse" floors to the nearest 10 — hence the jumpy
    // readout. We keep the float and round for display.
    uploadProgressGranularity: "all",
    onUploadProgress: (p) => {
      setProgress(p);
      if (p >= 100) setStatus("finalizing");
    },
    onClientUploadComplete: () => {
      setProgress(100);
      setStatus("done");
      onDone?.();
    },
    onUploadError: (e) => {
      setStatus("error");
      setError(e.message);
    },
  });

  const start = useCallback(
    async (file: File, meta: LibraryUploadMeta) => {
      setError(null);
      setProgress(0);
      setFileName(file.name);
      setStatus("uploading");
      await startUpload([file], meta);
    },
    [startUpload],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setFileName(null);
  }, []);

  return { start, reset, status, progress, error, fileName, isUploading };
}
