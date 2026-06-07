"use client";

import { api } from "@wikipefia/convex/api";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { ConfigIntegrityPanel } from "@/components/repositories/config-integrity-panel";
import { Btn, EmptyState, PageHeader, Panel } from "@/components/ui/kit";
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
      ) : projects.length === 0 ? (
        <EmptyState
          title="No repositories"
          hint="Run Discover repos to import content repositories from the GitHub App installation."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Repo list */}
          <Panel className="self-start">
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
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-none"
                  >
                    <span
                      className="w-1.5 h-1.5 shrink-0"
                      style={{ backgroundColor: meta.color }}
                      title={meta.label}
                    />
                    <span className="min-w-0">
                      <span
                        className="block text-[12px] font-semibold truncate"
                        style={{ ...mono, color: C.text }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="block text-[9px] truncate"
                        style={{ ...mono, color: C.textMuted }}
                      >
                        {p.githubRepo}
                      </span>
                    </span>
                  </button>
                  <Btn
                    variant="ghost"
                    onClick={() => handleSync(p.slug)}
                    disabled={syncing.has(p.slug)}
                  >
                    {syncing.has(p.slug) ? "Syncing…" : "Sync"}
                  </Btn>
                </div>
              );
            })}
          </Panel>

          {/* Integrity panel */}
          <div>
            {selectedProject ? (
              <ConfigIntegrityPanel project={selectedProject} />
            ) : (
              <Panel className="px-4 py-10 text-center">
                <span
                  className="text-[10px] tracking-wider"
                  style={{ ...mono, color: C.textMuted }}
                >
                  Select a repository to inspect its config.
                </span>
              </Panel>
            )}
          </div>
        </div>
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
