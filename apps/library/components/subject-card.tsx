import Link from "next/link";
import { FONT } from "@/lib/theme";
import type { SubjectWithCount } from "@/lib/types";

/**
 * A subject "shelf" card on the home page. The whole library is organized
 * around these — clicking opens the subject's files.
 */
export function SubjectCard({ subject }: { subject: SubjectWithCount }) {
  const { fileCount } = subject;

  return (
    <Link
      href={`/subject/${subject._id}`}
      className="group relative flex min-h-[150px] flex-col justify-between overflow-hidden border border-[var(--c-border-light)] bg-[var(--c-bg-white)] p-5 transition-colors hover:border-[var(--c-accent)]"
    >
      {/* Spine accent that grows on hover */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--c-border-light)] transition-colors group-hover:bg-[var(--c-accent)]" />

      <div>
        <h3
          className="text-[19px] font-semibold leading-snug text-[var(--c-text)]"
          style={{ fontFamily: FONT.serif }}
        >
          {subject.name}
        </h3>
        <p
          className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--c-text-muted)]"
          style={{ fontFamily: FONT.mono }}
        >
          {subject.slug}
        </p>
      </div>

      <div
        className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]"
        style={{ fontFamily: FONT.mono }}
      >
        <span>
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100">
          Open →
        </span>
      </div>
    </Link>
  );
}
