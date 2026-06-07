"use client";

import { api } from "@wikipefia/convex/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { SubjectDialog } from "@/components/subjects/subject-dialog";
import { Badge, Btn, EmptyState, PageHeader, Panel } from "@/components/ui/kit";
import { C } from "@/lib/theme";
import {
  PROJECT_TYPE_LABELS,
  type ProjectDoc,
  type ProjectType,
} from "@/lib/types";

const mono = { fontFamily: "var(--font-mono)" } as const;
const FILTERS: Array<ProjectType | "all"> = [
  "all",
  "subject",
  "teacher",
  "system",
];

const TYPE_COLORS: Record<ProjectType, string> = {
  subject: "#2563EB",
  teacher: "#7C3AED",
  system: "#059669",
};

export default function SubjectsPage() {
  const projects = useQuery(api.projects.list);
  const remove = useMutation(api.projects.remove);

  const [filter, setFilter] = useState<ProjectType | "all">("all");
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; project: ProjectDoc } | null
  >(null);

  const filtered = (projects ?? []).filter(
    (p) => filter === "all" || p.type === filter,
  );

  const handleDelete = async (p: ProjectDoc) => {
    if (
      !window.confirm(
        `Delete "${p.name}" (${p.slug})? This only removes it from the admin registry, not from GitHub.`,
      )
    )
      return;
    try {
      await remove({ id: p._id });
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle="Registered projects across all content types"
        actions={
          <Btn variant="primary" onClick={() => setDialog({ mode: "create" })}>
            New project
          </Btn>
        }
      />

      <div className="flex items-center gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] border cursor-pointer transition-colors"
            style={{
              ...mono,
              color: filter === f ? "#fff" : C.textMuted,
              backgroundColor: filter === f ? C.accent : "transparent",
              borderColor: filter === f ? C.accent : C.borderLight,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {projects === undefined ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No projects"
          hint="Create one, or run Discover repos on the Overview page to import from GitHub."
        />
      ) : (
        <Panel>
          {filtered.map((p, i) => (
            <div
              key={p._id}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderTop: i === 0 ? "none" : `1px solid ${C.borderLight}`,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge color={TYPE_COLORS[p.type]}>
                  {PROJECT_TYPE_LABELS[p.type]}
                </Badge>
                <div className="min-w-0">
                  <div
                    className="text-[12px] font-semibold truncate"
                    style={{ ...mono, color: C.text }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="text-[9px] truncate"
                    style={{ ...mono, color: C.textMuted }}
                  >
                    {p.githubRepo} · {p.branch}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Btn
                  variant="ghost"
                  onClick={() => setDialog({ mode: "edit", project: p })}
                >
                  Edit
                </Btn>
                <Btn variant="danger" onClick={() => handleDelete(p)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {dialog && (
        <SubjectDialog
          mode={dialog.mode}
          project={dialog.mode === "edit" ? dialog.project : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function LoadingRow() {
  return (
    <div
      className="text-[10px] font-bold uppercase tracking-wider py-10 text-center"
      style={{ ...mono, color: C.textMuted }}
    >
      Loading…
    </div>
  );
}
