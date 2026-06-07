"use client";

import { api } from "@wikipefia/convex/api";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Btn, PageHeader, Panel, Stat } from "@/components/ui/kit";
import {
  checkConfigIntegrity,
  type IntegrityStatus,
  STATUS_META,
} from "@/lib/config-integrity";
import { C } from "@/lib/theme";

export default function OverviewPage() {
  const projects = useQuery(api.projects.list);
  const discoverRepos = useAction(api.github.discoverRepos);
  const [discovering, setDiscovering] = useState(false);

  const stats = useMemo(() => {
    const byType = { subject: 0, teacher: 0, system: 0 };
    const byStatus: Record<IntegrityStatus, number> = {
      ok: 0,
      warnings: 0,
      errors: 0,
      unsynced: 0,
    };
    const attention: Array<{
      slug: string;
      name: string;
      status: IntegrityStatus;
      count: number;
    }> = [];
    for (const p of projects ?? []) {
      byType[p.type]++;
      const report = checkConfigIntegrity(p);
      byStatus[report.status]++;
      if (report.status === "errors" || report.status === "warnings") {
        attention.push({
          slug: p.slug,
          name: p.name,
          status: report.status,
          count: report.diagnostics.length,
        });
      }
    }
    return { byType, byStatus, attention };
  }, [projects]);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      await discoverRepos({});
    } catch (e) {
      console.error("Discover failed:", e);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Project health at a glance"
        actions={
          <Btn
            variant="primary"
            onClick={handleDiscover}
            disabled={discovering}
          >
            {discovering ? "Discovering…" : "Discover repos"}
          </Btn>
        }
      />

      {projects === undefined ? (
        <LoadingRow />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Stat label="Subjects" value={stats.byType.subject} accent />
            <Stat label="Teachers" value={stats.byType.teacher} />
            <Stat label="System" value={stats.byType.system} />
            <Stat label="Repositories" value={projects.length} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Stat label="Config OK" value={stats.byStatus.ok} />
            <Stat label="Warnings" value={stats.byStatus.warnings} />
            <Stat label="Errors" value={stats.byStatus.errors} />
            <Stat label="Not synced" value={stats.byStatus.unsynced} />
          </div>

          <h2
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            Needs attention
          </h2>

          {stats.attention.length === 0 ? (
            <Panel className="px-4 py-6 text-center">
              <span
                className="text-[10px] tracking-wider"
                style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
              >
                {projects.length === 0
                  ? "No repositories yet — run Discover repos."
                  : "All configs are valid. ✦"}
              </span>
            </Panel>
          ) : (
            <Panel>
              {stats.attention.map((a, i) => {
                const meta = STATUS_META[a.status];
                return (
                  <Link
                    key={a.slug}
                    href={`/repositories?project=${a.slug}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      borderTop:
                        i === 0 ? "none" : `1px solid ${C.borderLight}`,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge color={meta.color}>{meta.label}</Badge>
                      <span
                        className="text-[12px] font-semibold truncate"
                        style={{ color: C.text }}
                      >
                        {a.name}
                      </span>
                    </div>
                    <span
                      className="text-[10px] shrink-0"
                      style={{ color: C.textMuted }}
                    >
                      {a.count} issue{a.count === 1 ? "" : "s"}
                    </span>
                  </Link>
                );
              })}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function LoadingRow() {
  return (
    <div
      className="text-[10px] font-bold uppercase tracking-wider py-10 text-center"
      style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
    >
      Loading…
    </div>
  );
}
