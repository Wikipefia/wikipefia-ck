"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { FileCard } from "@/components/file-card";
import { UploadDialog } from "@/components/upload-dialog";
import type { LibraryFile } from "@/lib/types";

export default function Home() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [subjectId, setSubjectId] = useState<Id<"projects"> | "">("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const subjects = useQuery(api.library.subjects.list);
  const allTags = useQuery(api.library.tags.listAllTags);

  // When a tag filter is active, query by tag; otherwise paginate the list
  // (optionally scoped to a subject). Both are reactive subscriptions, so
  // newly-uploaded files appear automatically.
  const paginated = usePaginatedQuery(
    api.library.files.list,
    activeTag ? "skip" : { subjectId: subjectId || undefined },
    { initialNumItems: 24 },
  );
  const byTag = useQuery(
    api.library.files.listByTag,
    activeTag ? { tag: activeTag } : "skip",
  );

  const files: LibraryFile[] = activeTag ? (byTag ?? []) : paginated.results;
  const loading = activeTag ? byTag === undefined : paginated.isLoading;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">
            Wikipefia Library
          </h1>
          <p className="text-sm text-[var(--c-text-muted)]">
            Subject files with rich metadata.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="rounded-md bg-[var(--c-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Upload
        </button>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--c-text-muted)]">Subject</span>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value as Id<"projects"> | "");
              setActiveTag(null);
            }}
            className="rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1.5 text-sm"
          >
            <option value="">All subjects</option>
            {subjects?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {allTags && allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-[var(--c-text-muted)]">Tags</span>
            {activeTag && (
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className="rounded-full bg-[var(--c-accent)] px-2.5 py-0.5 text-xs text-white"
              >
                #{activeTag} ✕
              </button>
            )}
            {!activeTag &&
              allTags.slice(0, 20).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className="rounded-full bg-[var(--c-bg)] px-2.5 py-0.5 text-xs text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
                >
                  #{tag}
                </button>
              ))}
          </div>
        )}
      </div>

      {loading && files.length === 0 ? (
        <p className="text-sm text-[var(--c-text-muted)]">Loading…</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-[var(--c-text-muted)]">
          No files yet. Click <strong>Upload</strong> to add one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <FileCard key={file._id} file={file} />
          ))}
        </div>
      )}

      {!activeTag && paginated.status === "CanLoadMore" && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => paginated.loadMore(24)}
            className="rounded-md border border-[var(--c-border)] px-4 py-2 text-sm"
          >
            Load more
          </button>
        </div>
      )}

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} />}
    </main>
  );
}
