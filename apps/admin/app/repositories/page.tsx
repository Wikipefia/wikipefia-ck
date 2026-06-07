"use client";

import { api } from "@wikipefia/convex/api";
import { Button, Card } from "@wikipefia/ui";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { ConfigIntegrityPanel } from "@/components/repositories/config-integrity-panel";
import { Empty, PageHeader } from "@/components/ui/kit";
import { checkConfigIntegrity, STATUS_META } from "@/lib/config-integrity";
import { C } from "@/lib/theme";
import type { ProjectDoc } from "@/lib/types";

const mono = { fontFamily: "var(--font-mono)" } as const;

export default function RepositoriesPage() {
  const projects = useQuery(api.projects.list);
  const syncProject = useAction(api.github.syncProject);
  const discoverRepos = useAction(api.github.discoverRepos);

  const [selected, setSelected] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [discovering, setDiscovering] = useState(false);

  // Preselect from ?project=<slug> (e.g. deep-linked from Overview).
  useEffect(() => {
    const fromURL = new URLSearchParams(window.location.search).get("project");
    if (fromURL) setSelected(fromURL);
  }, []);

  const setSync = (slug: string, on: boolean) =>
    setSyncing((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });

  const handleSync = async (slug: string) => {
    setSync(slug, true);
    try {
      await syncProject({ slug });
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSync(slug, false);
    }
  };

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

  const selectedProject: ProjectDoc | undefined = projects?.find(
    (p) => p.slug === selected,
  );

  return (
    <div>
      <PageHeader
        title="Repositories"
        subtitle="Sync content repos and verify config integrity"
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
        <Empty title="Loading…" />
      ) : projects.length === 0 ? (
        <Empty
          title="No repositories"
          hint="Run Discover repos to import content repositories from the GitHub App installation."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Repo list */}
          <Card className="self-start">
            {projects.map((p, i) => {
              const meta = STATUS_META[checkConfigIntegrity(p).status];
              const isSel = p.slug === selected;
              return (
                <div
                  key={p._id}
                  className="flex items-center justify-between px-4 py-3 transition-colors"
                  style={{
                    borderTop: i === 0 ? "none" : `1px solid ${C.borderLight}`,
                    borderLeft: `2px solid ${isSel ? C.accent : "transparent"}`,
                    backgroundColor: isSel ? C.bg : "transparent",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(p.slug)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 border-none bg-transparent text-left"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0"
                      style={{ backgroundColor: meta.color }}
                      title={meta.label}
                    />
                    <span className="min-w-0">
                      <span
                        className="block truncate text-[12px] font-semibold text-fg"
                        style={mono}
                      >
                        {p.name}
                      </span>
                      <span
                        className="block truncate text-[9px] text-muted"
                        style={mono}
                      >
                        {p.githubRepo}
                      </span>
                    </span>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(p.slug)}
                    disabled={syncing.has(p.slug)}
                  >
                    {syncing.has(p.slug) ? "Syncing…" : "Sync"}
                  </Button>
                </div>
              );
            })}
          </Card>

          {/* Integrity panel */}
          <div>
            {selectedProject ? (
              <ConfigIntegrityPanel project={selectedProject} />
            ) : (
              <Card className="px-4 py-10 text-center">
                <span
                  className="text-[10px] tracking-wider text-muted"
                  style={mono}
                >
                  Select a repository to inspect its config.
                </span>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
