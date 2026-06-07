import Link from "next/link";
import {
  DOCUMENT_TYPE_ICON,
  type DocumentType,
  formatBytes,
  TRANSCRIPTION_LABEL,
} from "@/lib/metadata";
import type { LibraryFile } from "@/lib/types";

/** Compact card for a file in the grid. Links to its detail page. */
export function FileCard({ file }: { file: LibraryFile }) {
  const icon = DOCUMENT_TYPE_ICON[file.documentType as DocumentType] ?? "📁";

  return (
    <Link
      href={`/file/${file._id}`}
      className="flex flex-col gap-2 rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg-white)] p-4 transition-colors hover:border-[var(--c-accent)]"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium" title={file.title}>
            {file.title}
          </h3>
          <p className="truncate text-xs text-[var(--c-text-muted)]">
            {file.subjectSlug} · {formatBytes(file.size)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--c-text-muted)]">
        <span title="Average rating">
          ⭐ {file.ratingAvg > 0 ? file.ratingAvg.toFixed(1) : "—"}
          {file.ratingCount > 0 && ` (${file.ratingCount})`}
        </span>
        {file.transcriptionStatus !== "none" && (
          <span className="rounded bg-[var(--c-bg)] px-1.5 py-0.5">
            {TRANSCRIPTION_LABEL[file.transcriptionStatus]}
          </span>
        )}
      </div>

      {file.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {file.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded bg-[var(--c-bg)] px-1.5 py-0.5 text-[11px] text-[var(--c-text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
