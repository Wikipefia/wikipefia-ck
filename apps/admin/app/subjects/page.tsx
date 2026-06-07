"use client";

import { api } from "@wikipefia/convex/api";
import {
  Badge,
  type BadgeProps,
  Button,
  Card,
  SegmentedControl,
} from "@wikipefia/ui";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { SubjectDialog } from "@/components/subjects/subject-dialog";
import { Empty, PageHeader } from "@/components/ui/kit";
import { C } from "@/lib/theme";
import {
  PROJECT_TYPE_LABELS,
  type ProjectDoc,
  type ProjectType,
} from "@/lib/types";

const mono = { fontFamily: "var(--font-mono)" } as const;

type Filter = ProjectType | "all";

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "subject", label: "Subject" },
  { value: "teacher", label: "Teacher" },
  { value: "system", label: "System" },
];

const TYPE_BADGE: Record<ProjectType, NonNullable<BadgeProps["variant"]>> = {
  subject: "accent",
  teacher: "solid",
  system: "success",
};

export default function SubjectsPage() {
  const projects = useQuery(api.projects.list);
  const remove = useMutation(api.projects.remove);

  const [filter, setFilter] = useState<Filter>("all");
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
          <Button
            variant="primary"
            onClick={() => setDialog({ mode: "create" })}
          >
            New project
          </Button>
        }
      />

      <div className="mb-4">
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          className="w-fit"
        />
      </div>

      {projects === undefined ? (
        <Empty title="Loading…" />
      ) : filtered.length === 0 ? (
        <Empty
          title="No projects"
          hint="Create one, or run Discover repos on the Overview page to import from GitHub."
        />
      ) : (
        <Card>
          {filtered.map((p, i) => (
            <div
              key={p._id}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderTop: i === 0 ? "none" : `1px solid ${C.borderLight}`,
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Badge variant={TYPE_BADGE[p.type]}>
                  {PROJECT_TYPE_LABELS[p.type]}
                </Badge>
                <div className="min-w-0">
                  <div
                    className="truncate text-[12px] font-semibold text-fg"
                    style={mono}
                  >
                    {p.name}
                  </div>
                  <div className="truncate text-[9px] text-muted" style={mono}>
                    {p.githubRepo} · {p.branch}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialog({ mode: "edit", project: p })}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(p)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </Card>
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
