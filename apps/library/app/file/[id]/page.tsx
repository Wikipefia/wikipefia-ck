"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Comments } from "@/components/comments";
import { MetadataEditor } from "@/components/metadata-editor";
import { RatingStars } from "@/components/rating-stars";
import { TagEditor } from "@/components/tag-editor";
import {
  DOCUMENT_TYPE_ICON,
  type DocumentType,
  formatBytes,
  TRANSCRIPTION_LABEL,
} from "@/lib/metadata";

export default function FileDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileId = params.id as Id<"libraryFiles">;

  const file = useQuery(api.library.files.get, { fileId });
  const downloadUrl = useQuery(api.library.files.getDownloadUrl, { fileId });
  const requestTranscription = useMutation(
    api.library.transcriptions.requestTranscription,
  );
  const remove = useMutation(api.library.files.remove);

  const [editing, setEditing] = useState(false);

  if (file === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-[var(--c-text-muted)]">Loading…</p>
      </main>
    );
  }
  if (file === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm">File not found.</p>
        <Link href="/" className="text-sm text-[var(--c-accent)]">
          ← Back to library
        </Link>
      </main>
    );
  }

  const icon = DOCUMENT_TYPE_ICON[file.documentType as DocumentType] ?? "📁";
  const canRequestTranscription =
    file.transcriptionStatus === "none" ||
    file.transcriptionStatus === "failed";

  async function handleDelete() {
    if (!confirm("Delete this file permanently? This cannot be undone."))
      return;
    await remove({ fileId });
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/" className="text-sm text-[var(--c-accent)]">
        ← Back to library
      </Link>

      <header className="mt-3 flex items-start gap-3">
        <span className="text-3xl leading-none">{icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-semibold">{file.title}</h1>
          <p className="text-sm text-[var(--c-text-muted)]">
            {file.subjectSlug} · {file.documentType} · {formatBytes(file.size)}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={file.originalName}
            className="rounded-md bg-[var(--c-accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Download
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="rounded-md border border-[var(--c-border)] px-4 py-2 text-sm"
        >
          {editing ? "Close editor" : "Edit metadata"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md border border-[var(--c-border)] px-4 py-2 text-sm text-red-500"
        >
          Delete
        </button>
      </div>

      {editing ? (
        <Section title="Edit metadata">
          <MetadataEditor file={file} onDone={() => setEditing(false)} />
        </Section>
      ) : (
        <Section title="Metadata">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
            <Meta label="Original name" value={file.originalName} />
            <Meta label="Description" value={file.description} />
            <Meta label="Content type" value={file.contentType} />
            <Meta label="Language" value={file.language} />
            <Meta
              label="Year"
              value={file.year !== undefined ? String(file.year) : undefined}
            />
            <Meta label="Author (source)" value={file.authorName} />
            <Meta label="Source URL" value={file.sourceUrl} />
            <Meta
              label="Page count"
              value={
                file.pageCount !== undefined
                  ? String(file.pageCount)
                  : undefined
              }
            />
            {file.customFields &&
              Object.entries(file.customFields).map(([k, v]) => (
                <Meta key={k} label={k} value={v} />
              ))}
          </dl>
        </Section>
      )}

      <Section title="Rating">
        <RatingStars
          fileId={file._id}
          ratingAvg={file.ratingAvg}
          ratingCount={file.ratingCount}
        />
      </Section>

      <Section title="Tags">
        <TagEditor fileId={file._id} tags={file.tags} />
      </Section>

      <Section title="Transcription">
        <div className="flex items-center gap-3">
          <span className="text-sm">
            {TRANSCRIPTION_LABEL[file.transcriptionStatus]}
          </span>
          {canRequestTranscription && (
            <button
              type="button"
              onClick={() => requestTranscription({ fileId })}
              className="rounded-md border border-[var(--c-border)] px-3 py-1.5 text-sm"
            >
              Request transcription
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--c-text-muted)]">
          The transcription service is not implemented yet — this only flips the
          status to <code>pending</code>.
        </p>
      </Section>

      <Section title="Comments">
        <Comments fileId={file._id} />
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--c-text-muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-[var(--c-text-muted)]">{label}</dt>
      <dd className="break-words">{value}</dd>
    </>
  );
}
