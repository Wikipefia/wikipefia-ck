"use client";

import { Badge, type BadgeProps, Card } from "@wikipefia/ui";
import {
  checkConfigIntegrity,
  type DiagnosticSeverity,
  STATUS_BADGE,
  STATUS_META,
} from "@/lib/config-integrity";
import { C } from "@/lib/theme";
import type { ProjectDoc } from "@/lib/types";

const mono = { fontFamily: "var(--font-mono)" } as const;

const SEVERITY_BADGE: Record<
  DiagnosticSeverity,
  NonNullable<BadgeProps["variant"]>
> = {
  error: "danger",
  warning: "warning",
};

export function ConfigIntegrityPanel({ project }: { project: ProjectDoc }) {
  const report = checkConfigIntegrity(project);

  return (
    <Card>
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: C.borderLight }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="truncate text-[12px] font-semibold text-fg"
            style={mono}
          >
            {project.name}
          </span>
          <Badge variant={STATUS_BADGE[report.status]}>
            {STATUS_META[report.status].label}
          </Badge>
        </div>
        <span className="shrink-0 text-[9px] text-muted" style={mono}>
          {project.lastSynced
            ? `synced ${new Date(project.lastSynced).toLocaleString()}`
            : "never synced"}
        </span>
      </div>

      {report.status === "unsynced" ? (
        <p
          className="px-4 py-6 text-center text-[10px] tracking-wider text-muted"
          style={mono}
        >
          Sync this repository to validate its config.json.
        </p>
      ) : report.diagnostics.length === 0 ? (
        <p
          className="px-4 py-6 text-center text-[10px] tracking-wider text-success"
          style={mono}
        >
          config.json is valid and all referenced articles exist. ✦
        </p>
      ) : (
        <ul>
          {report.diagnostics.map((d, i) => (
            <li
              key={`${d.category}-${i}`}
              className="flex items-start gap-3 px-4 py-2.5"
              style={{
                borderTop: i === 0 ? "none" : `1px solid ${C.borderLight}`,
              }}
            >
              <Badge variant={SEVERITY_BADGE[d.severity]} size="sm">
                {d.severity}
              </Badge>
              <div className="min-w-0">
                <span
                  className="mr-2 text-[8px] font-bold uppercase tracking-[0.12em] text-muted"
                  style={mono}
                >
                  {d.category}
                </span>
                <span className="text-[11px] text-fg" style={mono}>
                  {d.message}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
