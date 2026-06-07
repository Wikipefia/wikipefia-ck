"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { usePaginatedQuery, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileCard } from "@/components/file-card";
import { Masthead } from "@/components/masthead";
import { Btn, Pill } from "@/components/ui";
import { UploadDialog } from "@/components/upload-dialog";
import { C, FONT } from "@/lib/theme";
import { useLibraryUpload } from "@/lib/use-library-upload";

export default function SubjectPage() {
  const params = useParams<{ id: string }>();
  const subjectId = params.id as Id<"projects">;

  const subject = useQuery(api.library.subjects.get, { subjectId });
  const paginated = usePaginatedQuery(
    api.library.files.list,
    { subjectId },
    { initialNumItems: 48 },
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  const upload = useLibraryUpload();
  const uploading =
    upload.status === "uploading" || upload.status === "finalizing";

  // Clear the banner shortly after a successful drop-upload.
  useEffect(() => {
    if (upload.status !== "done") return;
    const t = setTimeout(() => upload.reset(), 1400);
    return () => clearTimeout(t);
  }, [upload.status, upload.reset]);

  const files = paginated.results;
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const f of files) for (const t of f.tags) set.add(t);
    return Array.from(set).sort();
  }, [files]);
  const shown = activeTag
    ? files.filter((f) => f.tags.includes(activeTag))
    : files;

  function onDropFile(f: File) {
    if (uploading) return; // one drop-upload at a time
    upload.start(f, {
      subjectId,
      title: f.name.replace(/\.[^.]+$/, ""),
    });
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: page-wide drop target; the dialog/button remain the keyboard paths.
    <div
      className="flex min-h-screen flex-col"
      onDragEnter={(e) => {
        e.preventDefault();
        // While the modal is open it owns drag-and-drop; the page stands down
        // so a drop into the dialog isn't also handled here (double upload).
        if (uploadOpen) return;
        dragDepth.current += 1;
        setDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        if (uploadOpen) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (uploadOpen) return;
        dragDepth.current = 0;
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onDropFile(f);
      }}
    >
      <Masthead
        actions={
          <Btn variant="primary" onClick={() => setUploadOpen(true)}>
            + Upload
          </Btn>
        }
      />

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Link
          href="/"
          className="inline-block text-[10px] uppercase tracking-[0.18em] text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-accent)]"
          style={{ fontFamily: FONT.mono }}
        >
          ← Subjects
        </Link>

        <div className="mt-4 mb-7 flex items-end justify-between gap-4 border-b border-[var(--c-border-light)] pb-5">
          <div>
            <h1
              className="text-[28px] font-semibold leading-tight text-[var(--c-text)]"
              style={{ fontFamily: FONT.serif }}
            >
              {subject ? subject.name : "…"}
            </h1>
            <p
              className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--c-text-muted)]"
              style={{ fontFamily: FONT.mono }}
            >
              {subject?.slug}
              {!paginated.isLoading && ` · ${files.length} loaded`}
            </p>
          </div>
          <span
            className="hidden shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--c-text-muted)] sm:block"
            style={{ fontFamily: FONT.mono }}
          >
            Drop a file anywhere to upload
          </span>
        </div>

        {/* Drop-upload progress banner */}
        <AnimatePresence>
          {upload.status !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 border p-3"
              style={{
                borderColor: upload.status === "error" ? "#dc2626" : C.accent,
                backgroundColor: C.bgWhite,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="min-w-0 flex-1 truncate text-[12px] text-[var(--c-text)]"
                  style={{ fontFamily: FONT.mono }}
                >
                  {upload.fileName}
                </span>
                <span
                  className="shrink-0 text-[10px] uppercase tracking-[0.14em]"
                  style={{
                    fontFamily: FONT.mono,
                    color: upload.status === "error" ? "#dc2626" : C.accent,
                  }}
                >
                  {upload.status === "uploading"
                    ? `${upload.progress.toFixed(1)}%`
                    : upload.status === "finalizing"
                      ? "Finalizing"
                      : upload.status === "done"
                        ? "Done ✓"
                        : "Failed"}
                </span>
              </div>
              {upload.status !== "error" && (
                <div className="mt-2 h-1 w-full bg-[var(--c-border-light)]">
                  <div
                    className="h-1 bg-[var(--c-accent)] transition-[width] duration-150 ease-out"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.status === "error" && (
                <p
                  className="mt-1 text-[11px] text-red-500"
                  style={{ fontFamily: FONT.mono }}
                >
                  {upload.error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {availableTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5">
            <Pill
              active={activeTag === null}
              onClick={() => setActiveTag(null)}
            >
              All
            </Pill>
            {availableTags.map((tag) => (
              <Pill
                key={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag(tag)}
              >
                #{tag}
              </Pill>
            ))}
          </div>
        )}

        {paginated.isLoading && files.length === 0 ? (
          <GridSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState onUpload={() => setUploadOpen(true)} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {shown.map((file, i) => (
                <motion.div
                  key={file._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.02 }}
                >
                  <FileCard file={file} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {paginated.status === "CanLoadMore" && (
          <div className="mt-8 flex justify-center">
            <Btn variant="outline" onClick={() => paginated.loadMore(48)}>
              Load more
            </Btn>
          </div>
        )}

        {/* Full-page drop overlay */}
        <AnimatePresence>
          {dragOver && !uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none fixed inset-0 z-40 m-3 flex items-center justify-center border-2 border-dashed"
              style={{
                borderColor: C.accent,
                backgroundColor:
                  "color-mix(in srgb, var(--c-accent) 8%, transparent)",
              }}
            >
              <span
                className="text-[13px] font-bold uppercase tracking-[0.2em] text-[var(--c-accent)]"
                style={{ fontFamily: FONT.mono }}
              >
                Drop to upload → {subject?.name ?? "this subject"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {uploadOpen && (
          <UploadDialog
            onClose={() => setUploadOpen(false)}
            lockedSubjectId={subjectId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list.
          key={i}
          className="h-[150px] animate-pulse border border-[var(--c-border-light)] bg-[var(--c-bg)]"
        />
      ))}
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-[var(--c-border)] py-20 text-center">
      <span
        className="text-[10px] uppercase tracking-[0.2em] text-[var(--c-text-muted)]"
        style={{ fontFamily: FONT.mono }}
      >
        Empty shelf
      </span>
      <p
        className="mt-3 max-w-xs text-[15px] text-[var(--c-text)]"
        style={{ fontFamily: FONT.serif }}
      >
        Drop a file anywhere on this page — or use the button — to add the first
        one.
      </p>
      <div className="mt-5">
        <Btn variant="primary" onClick={onUpload}>
          + Upload a file
        </Btn>
      </div>
    </div>
  );
}
