"use client";

import { Badge, Panel } from "@/components/ui/kit";
import {
  checkConfigIntegrity,
  type DiagnosticSeverity,
  STATUS_META,
} from "@/lib/config-integrity";
import { C } from "@/lib/theme";
import type { ProjectDoc } from "@/lib/types";

const mono = { fontFamily: "var(--font-mono)" } as const;

const SEVERITY_COLOR: Record<DiagnosticSeverity, string> = {
  error: "#DC2626",
  warning: "#D97706",
};

export function ConfigIntegrityPanel({ project }: { project: ProjectDoc }) {
  const report = checkConfigIntegrity(project);
  const meta = STATUS_META[report.status];

  return (
    <Panel>
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: C.borderLight }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="text-[12px] font-semibold truncate"
            style={{ ...mono, color: C.text }}
          >
            {project.name}
          </span>
          <Badge color={meta.color}>{meta.label}</Badge>
        </div>
        <span
          className="text-[9px] shrink-0"
          style={{ ...mono, color: C.textMuted }}
        >
          {project.lastSynced
            ? `synced ${new Date(project.lastSynced).toLocaleString()}`
            : "never synced"}
        </span>
      </div>

      {report.status === "unsynced" ? (
        <p
          className="px-4 py-6 text-[10px] tracking-wider text-center"
          style={{ ...mono, color: C.textMuted }}
        >
          Sync this repository to validate its config.json.
        </p>
      ) : report.diagnostics.length === 0 ? (
        <p
          className="px-4 py-6 text-[10px] tracking-wider text-center"
          style={{ ...mono, color: "#059669" }}
        >
          config.json is valid and all referenced articles exist. ✦
        </p>
      ) : (
        <ul>
          {report.diagnostics.map((d, i) => (
            <li
              key={`${d.category}-${i}`}
              className="px-4 py-2.5 flex items-start gap-3"
              style={{
                borderTop: i === 0 ? "none" : `1px solid ${C.borderLight}`,
              }}
            >
              <span
                className="text-[7px] font-bold uppercase tracking-[0.12em] mt-0.5 px-1 py-0.5 border shrink-0"
                style={{
                  ...mono,
                  color: SEVERITY_COLOR[d.severity],
                  borderColor: SEVERITY_COLOR[d.severity],
                }}
              >
                {d.severity}
              </span>
              <div className="min-w-0">
                <span
                  className="text-[8px] font-bold uppercase tracking-[0.12em] mr-2"
                  style={{ ...mono, color: C.textMuted }}
                >
                  {d.category}
                </span>
                <span
                  className="text-[11px]"
                  style={{ ...mono, color: C.text }}
                >
                  {d.message}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
