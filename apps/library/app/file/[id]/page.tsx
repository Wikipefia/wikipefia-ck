"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Comments } from "@/components/comments";
import { Masthead } from "@/components/masthead";
import { MetadataEditor } from "@/components/metadata-editor";
import { RatingStars } from "@/components/rating-stars";
import { TagEditor } from "@/components/tag-editor";
import { Btn, SectionHeading, TypeBadge } from "@/components/ui";
import {
  documentTypeCode,
  formatBytes,
  TRANSCRIPTION_COLOR,
  TRANSCRIPTION_LABEL,
} from "@/lib/metadata";
import { FONT } from "@/lib/theme";

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
      <Shell>
        <p
          className="text-[12px] text-[var(--c-text-muted)]"
          style={{ fontFamily: FONT.mono }}
        >
          Loading…
        </p>
      </Shell>
    );
  }
  if (file === null) {
    return (
      <Shell>
        <p
          className="text-[15px] text-[var(--c-text)]"
          style={{ fontFamily: FONT.serif }}
        >
          File not found.
        </p>
        <Link
          href="/"
          className="mt-2 inline-block text-[11px] uppercase tracking-[0.12em] text-[var(--c-accent)]"
          style={{ fontFamily: FONT.mono }}
        >
          ← Back to library
        </Link>
      </Shell>
    );
  }

  const canRequestTranscription =
    file.transcriptionStatus === "none" ||
    file.transcriptionStatus === "failed";

  const subjectHref = `/subject/${file.subjectId}`;

  async function handleDelete() {
    if (!confirm("Delete this file permanently? This cannot be undone."))
      return;
    await remove({ fileId });
    // Return to the file's subject shelf, not the subject picker.
    router.push(subjectHref);
  }

  return (
    <Shell>
      <Link
        href={subjectHref}
        className="inline-block text-[10px] uppercase tracking-[0.18em] text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-accent)]"
        style={{ fontFamily: FONT.mono }}
      >
        ← {file.subjectSlug}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* Title block */}
        <div className="mt-4 flex items-start gap-4">
          <TypeBadge code={documentTypeCode(file.documentType)} />
          <div className="min-w-0 flex-1">
            <h1
              className="text-[26px] font-semibold leading-tight text-[var(--c-text)]"
              style={{ fontFamily: FONT.serif }}
            >
              {file.title}
            </h1>
            <p
              className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]"
              style={{ fontFamily: FONT.mono }}
            >
              <Link
                href={subjectHref}
                className="transition-colors hover:text-[var(--c-accent)]"
              >
                {file.subjectSlug}
              </Link>
              <span className="opacity-40">·</span>
              <span>{file.documentType}</span>
              <span className="opacity-40">·</span>
              <span>{formatBytes(file.size)}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 border border-[var(--c-accent)] bg-[var(--c-accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
              style={{ fontFamily: FONT.mono }}
            >
              ↓ Download
            </a>
          )}
          <Btn variant="outline" onClick={() => setEditing((e) => !e)}>
            {editing ? "Close editor" : "Edit metadata"}
          </Btn>
          <Btn variant="danger" onClick={handleDelete}>
            Delete
          </Btn>
        </div>

        {/* Two-column body on wide screens */}
        <div className="mt-9 grid grid-cols-1 gap-9 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-9">
            <section>
              <SectionHeading>{editing ? "Edit" : "Metadata"}</SectionHeading>
              {editing ? (
                <MetadataEditor file={file} onDone={() => setEditing(false)} />
              ) : (
                <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2.5 text-[13px]">
                  <Meta label="File" value={file.originalName} />
                  <Meta label="Description" value={file.description} />
                  <Meta label="Mime" value={file.contentType} />
                  <Meta label="Language" value={file.language} />
                  <Meta
                    label="Year"
                    value={
                      file.year !== undefined ? String(file.year) : undefined
                    }
                  />
                  <Meta label="Author" value={file.authorName} />
                  <Meta label="Source" value={file.sourceUrl} link />
                  <Meta
                    label="Pages"
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
              )}
            </section>

            <section>
              <SectionHeading>Comments</SectionHeading>
              <Comments fileId={file._id} />
            </section>
          </div>

          <div className="space-y-9">
            <section>
              <SectionHeading>Rating</SectionHeading>
              <RatingStars
                fileId={file._id}
                ratingAvg={file.ratingAvg}
                ratingCount={file.ratingCount}
              />
            </section>

            <section>
              <SectionHeading>Tags</SectionHeading>
              <TagEditor fileId={file._id} tags={file.tags} />
            </section>

            <section>
              <SectionHeading>Transcript</SectionHeading>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      TRANSCRIPTION_COLOR[file.transcriptionStatus],
                  }}
                />
                <span
                  className="text-[12px] uppercase tracking-[0.1em]"
                  style={{
                    fontFamily: FONT.mono,
                    color: TRANSCRIPTION_COLOR[file.transcriptionStatus],
                  }}
                >
                  {TRANSCRIPTION_LABEL[file.transcriptionStatus]}
                </span>
              </div>
              {canRequestTranscription && (
                <div className="mt-3">
                  <Btn
                    variant="outline"
                    onClick={() => requestTranscription({ fileId })}
                  >
                    Request transcription
                  </Btn>
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--c-text-muted)]">
                The transcription service isn’t live yet — requesting only flips
                the status to{" "}
                <span className="text-[var(--c-text)]">pending</span> for the
                future pipeline.
              </p>
            </section>
          </div>
        </div>
      </motion.div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Masthead />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        {children}
      </main>
    </div>
  );
}

function Meta({
  label,
  value,
  link = false,
}: {
  label: string;
  value?: string;
  link?: boolean;
}) {
  if (!value) return null;
  return (
    <>
      <dt
        className="text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]"
        style={{ fontFamily: FONT.mono }}
      >
        {label}
      </dt>
      <dd className="break-words text-[var(--c-text)]">
        {link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--c-accent)] underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </>
  );
}
