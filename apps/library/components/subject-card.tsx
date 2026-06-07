import Link from "next/link";
import { FONT } from "@/lib/theme";
import type { SubjectWithCount } from "@/lib/types";

/**
 * A subject "shelf" card on the home page. The whole library is organized
 * around these — clicking opens the subject's files. Styled with the shared
 * design-system tokens (surface / line / accent).
 */
export function SubjectCard({ subject }: { subject: SubjectWithCount }) {
  const { fileCount } = subject;

  return (
    <Link
      href={`/subject/${subject._id}`}
      className="group relative flex min-h-[150px] flex-col justify-between overflow-hidden border border-line-soft bg-surface p-5 transition-colors hover:border-accent"
    >
      {/* Spine accent that grows on hover */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-line-soft transition-colors group-hover:bg-accent" />

      <div>
        <h3
          className="text-[19px] font-semibold leading-snug text-fg group-hover:underline"
          style={{ fontFamily: FONT.serif }}
        >
          {subject.name}
        </h3>
        <p
          className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted"
          style={{ fontFamily: FONT.mono }}
        >
          {subject.slug}
        </p>
      </div>

      <div
        className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted"
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
