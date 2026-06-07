import { Badge } from "@wikipefia/ui";
import Link from "next/link";
import {
  documentTypeCode,
  formatBytes,
  TRANSCRIPTION_COLOR,
  TRANSCRIPTION_LABEL,
} from "@/lib/metadata";
import { FONT } from "@/lib/theme";
import type { LibraryFile } from "@/lib/types";

/** Card for a file in the grid. Sharp border that lights up accent on hover. */
export function FileCard({ file }: { file: LibraryFile }) {
  const transcribed = file.transcriptionStatus !== "none";

  return (
    <Link
      href={`/file/${file._id}`}
      className="group flex flex-col gap-3 border border-line-soft bg-surface p-4 transition-colors hover:border-accent"
    >
      <div className="flex items-center justify-between">
        <Badge variant="accent" size="sm" className="tracking-[0.18em]">
          {documentTypeCode(file.documentType)}
        </Badge>
        {transcribed && (
          <span
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em]"
            style={{
              fontFamily: FONT.mono,
              color: TRANSCRIPTION_COLOR[file.transcriptionStatus],
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: TRANSCRIPTION_COLOR[file.transcriptionStatus],
              }}
            />
            {TRANSCRIPTION_LABEL[file.transcriptionStatus]}
          </span>
        )}
      </div>

      <h3
        className="line-clamp-2 text-[17px] font-medium leading-snug text-fg"
        style={{ fontFamily: FONT.serif }}
        title={file.title}
      >
        {file.title}
      </h3>

      <div
        className="mt-auto flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-muted"
        style={{ fontFamily: FONT.mono }}
      >
        <span className="truncate">{file.subjectSlug}</span>
        <span className="opacity-40">·</span>
        <span className="shrink-0">{formatBytes(file.size)}</span>
      </div>

      <div className="flex items-center justify-between">
        <Stars avg={file.ratingAvg} count={file.ratingCount} />
        {file.tags.length > 0 && (
          <div
            className="flex items-center gap-1 text-[10px] text-muted"
            style={{ fontFamily: FONT.mono }}
          >
            <span className="opacity-60">#</span>
            <span className="max-w-[120px] truncate">
              {file.tags.slice(0, 3).join(" · ")}
              {file.tags.length > 3 && ` +${file.tags.length - 3}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function Stars({ avg, count }: { avg: number; count: number }) {
  const rounded = Math.round(avg);
  return (
    <span
      className="flex items-center gap-1 text-[11px]"
      style={{ fontFamily: FONT.mono }}
      title={count > 0 ? `${avg.toFixed(1)} from ${count}` : "Not rated"}
    >
      <span className="tracking-tight">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            style={{ color: s <= rounded ? "#f59e0b" : "var(--c-border)" }}
          >
            ★
          </span>
        ))}
      </span>
      <span className="text-[10px] text-muted">
        {count > 0 ? avg.toFixed(1) : "—"}
      </span>
    </span>
  );
}
