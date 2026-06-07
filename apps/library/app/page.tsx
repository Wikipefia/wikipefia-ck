"use client";

import { api } from "@wikipefia/convex/api";
import { EmptyState } from "@wikipefia/ui";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { useState } from "react";
import { Masthead } from "@/components/masthead";
import { SubjectCard } from "@/components/subject-card";
import { UploadDialog } from "@/components/upload-dialog";
import { FONT } from "@/lib/theme";

export default function Home() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const subjects = useQuery(api.library.subjects.listWithCounts);

  const sorted = subjects
    ? [...subjects].sort(
        (a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name),
      )
    : undefined;
  const totalFiles = subjects?.reduce((sum, s) => sum + s.fileCount, 0) ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Masthead onUpload={() => setUploadOpen(true)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-line-soft pb-5">
          <div>
            <h1
              className="text-[28px] font-semibold leading-tight text-fg"
              style={{ fontFamily: FONT.serif }}
            >
              Subjects
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              The library is organized by subject. Open a shelf to browse its
              files.
            </p>
          </div>
          {subjects && (
            <span
              className="hidden shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted sm:block"
              style={{ fontFamily: FONT.mono }}
            >
              {subjects.length} subjects · {totalFiles} files
            </span>
          )}
        </div>

        {sorted === undefined ? (
          <GridSkeleton />
        ) : sorted.length === 0 ? (
          <EmptyState className="border border-dashed border-line py-16">
            No subjects found
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((subject, i) => (
              <motion.div
                key={subject._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i, 10) * 0.02 }}
              >
                <SubjectCard subject={subject} />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} />}
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
          className="h-[150px] animate-pulse border border-line-soft bg-bg"
        />
      ))}
    </div>
  );
}
