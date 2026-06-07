"use client";

import { api } from "@wikipefia/convex/api";
import { Badge, Button, Card, EmptyState } from "@wikipefia/ui";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, Stat } from "@/components/ui/kit";
import {
  checkConfigIntegrity,
  type IntegrityStatus,
  STATUS_BADGE,
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
          <Button
            variant="primary"
            onClick={handleDiscover}
            disabled={discovering}
          >
            {discovering ? "Discovering…" : "Discover repos"}
          </Button>
        }
      />

      {projects === undefined ? (
        <EmptyState>Loading…</EmptyState>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Subjects" value={stats.byType.subject} accent />
            <Stat label="Teachers" value={stats.byType.teacher} />
            <Stat label="System" value={stats.byType.system} />
            <Stat label="Repositories" value={projects.length} />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Config OK" value={stats.byStatus.ok} />
            <Stat label="Warnings" value={stats.byStatus.warnings} />
            <Stat label="Errors" value={stats.byStatus.errors} />
            <Stat label="Not synced" value={stats.byStatus.unsynced} />
          </div>

          <h2
            className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Needs attention
          </h2>

          {stats.attention.length === 0 ? (
            <Card className="px-4 py-6 text-center">
              <span
                className="text-[10px] tracking-wider text-muted"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {projects.length === 0
                  ? "No repositories yet — run Discover repos."
                  : "All configs are valid. ✦"}
              </span>
            </Card>
          ) : (
            <Card>
              {stats.attention.map((a, i) => (
                <Link
                  key={a.slug}
                  href={`/repositories?project=${a.slug}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-bg"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderTop: i === 0 ? "none" : `1px solid ${C.borderLight}`,
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge variant={STATUS_BADGE[a.status]}>
                      {STATUS_META[a.status].label}
                    </Badge>
                    <span className="truncate text-[12px] font-semibold text-fg">
                      {a.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted">
                    {a.count} issue{a.count === 1 ? "" : "s"}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
