"use client";

import { api } from "@wikipefia/convex/api";
import { Badge, Button, Kbd } from "@wikipefia/ui";
import { useAction, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type CompileActionResult, compileAction } from "@/app/actions/compile";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "@/components/editor/code-editor";
import { ComponentMenu } from "@/components/editor/component-menu";
import { FrontmatterPanel } from "@/components/editor/frontmatter-panel";
import { LivePreview } from "@/components/editor/live-preview";
import { type CompileStatus, StatusBar } from "@/components/editor/status-bar";
import { useTheme } from "@/components/shared/theme-provider";
import { MetadataPanel } from "@/components/workspace/metadata-panel";
import { ProjectPicker } from "@/components/workspace/project-picker";
import { Sidebar } from "@/components/workspace/sidebar";
import { TabBar } from "@/components/workspace/tab-bar";
import {
  articlePath,
  createTabId,
  getArticleTitle,
  type OpenTab,
  type ProjectRecord,
  projectToSubject,
  type Subject,
  splitFrontmatter,
} from "@/lib/mock-data";
import type { PreviewError } from "@/lib/preview-error";
import { C } from "@/lib/theme";

const DEBOUNCE_MS = 350;

interface ProjectState {
  tabs: OpenTab[];
  activeTabId: string | null;
  tabContents: Record<string, string>;
}

const LS_DRAFTS = "wikipefia-studio:drafts";
const LS_RECENT = "wikipefia-studio:recent";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getProjectFromURL(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("project");
}

export default function EditorPage() {
  // Opt this component out of React Compiler memoization. The page
  // component holds the lion's share of the studio's local state
  // (~15 useState slots, several refs, multiple useEffects with
  // interlocking dependencies, and a Convex live-query). The compiler
  // (1.0.0) has been observed generating broken memoization caches
  // for components in this shape — the prior "i is not defined" crash
  // and the recent "Rendered more hooks than during the previous
  // render" failures both surfaced from React-Compiler-derived code,
  // not from the source as written. We get more correctness benefit
  // from running this component uncompiled than we lose in
  // memoization wins, since most expensive children (CodeEditor,
  // LivePreview) own their own internal memoization already.
  "use no memo";
  const { toggleTheme, resolvedTheme } = useTheme();

  // ── Convex ──
  const projects = useQuery(api.projects.list) as ProjectRecord[] | undefined;
  const syncProject = useAction(api.github.syncProject);
  const fetchFile = useAction(api.github.fetchFile);
  const discoverRepos = useAction(api.github.discoverRepos);

  // ── Project state ──
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [projectStates, setProjectStates] = useState<
    Record<string, ProjectState>
  >({});

  // Hydrate from URL + localStorage after mount
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readLS<Record<string, ProjectState>>(LS_DRAFTS, {});
    if (Object.keys(stored).length) setProjectStates(stored);
    setRecentProjects(readLS<string[]>(LS_RECENT, []));
    const fromURL = getProjectFromURL();
    if (fromURL) setCurrentProject(fromURL);
  }, []);

  // ── Editor state ──
  const [compiled, setCompiled] = useState<string | null>(null);
  const [toc, setToc] = useState<CompileActionResult["toc"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticsCount, setDiagnosticsCount] = useState(0);
  const [status, setStatus] = useState<CompileStatus>("idle");
  // Source-position metadata returned with each compile — used by the
  // live preview to map runtime errors back to editor coordinates.
  const [virtualPath, setVirtualPath] = useState<string | null>(null);
  const [frontmatterLines, setFrontmatterLines] = useState<number>(0);
  // Compile errors carry their own line; render errors arrive via the
  // preview's onPreviewError callback. We keep them in separate fields
  // and merge them into the editor's `errorLine` prop downstream.
  const [compileErrorLine, setCompileErrorLine] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  // Monotonically increasing per-call id. Each compile invocation
  // captures its own value; the post-await result handler ignores any
  // result whose id is no longer the latest. This is what keeps rapid
  // tab switches and rapid edits from racing — the slower compile
  // can't overwrite the faster one's compiled output.
  const compileGenRef = useRef(0);

  // ── Layout state ──
  const [splitPos, setSplitPos] = useState(50);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scrollSync, setScrollSync] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollingFrom = useRef<"editor" | "preview" | null>(null);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

  // ── Derived ──
  const currentProjectData = projects?.find((p) => p.slug === currentProject);
  const subject: Subject | undefined = currentProjectData
    ? projectToSubject(currentProjectData)
    : undefined;
  // Compile errors and runtime preview errors are mutually exclusive
  // (no compiled output → no render). Whichever exists wins.
  const editorErrorLine =
    compileErrorLine ?? previewError?.location?.line ?? null;
  const editorErrorMessage = error ?? previewError?.message ?? null;
  const ps = currentProject ? projectStates[currentProject] : undefined;
  const tabs = ps?.tabs ?? [];
  const activeTabId = ps?.activeTabId ?? null;
  const tabContents = ps?.tabContents ?? {};
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeContent = activeTabId ? (tabContents[activeTabId] ?? "") : "";
  const { frontmatter: activeFrontmatter, body: activeBody } =
    splitFrontmatter(activeContent);

  // ── Per-project state updater ──
  const updatePS = useCallback(
    (fn: (prev: ProjectState) => ProjectState) => {
      if (!currentProject) return;
      setProjectStates((all) => ({
        ...all,
        [currentProject]: fn(
          all[currentProject] ?? {
            tabs: [],
            activeTabId: null,
            tabContents: {},
          },
        ),
      }));
    },
    [currentProject],
  );

  // ── Open / close project ──
  const openProject = useCallback(
    async (slug: string) => {
      setCurrentProject(slug);
      setRecentProjects((prev) => [slug, ...prev.filter((s) => s !== slug)]);
      setPickerOpen(false);
      setSidebarCollapsed(false);
      setProjectStates((all) => {
        if (all[slug]) return all;
        return {
          ...all,
          [slug]: { tabs: [], activeTabId: null, tabContents: {} },
        };
      });
      setCompiled(null);
      setStatus("idle");
      setError(null);

      // Always sync to get latest tree/config from GitHub
      setSyncing(true);
      try {
        await syncProject({ slug });
      } catch (e) {
        console.error("Sync failed:", e);
      } finally {
        setSyncing(false);
      }
    },
    [syncProject],
  );

  const closeProject = useCallback(() => {
    setCurrentProject(null);
    setCompiled(null);
    setStatus("idle");
    setError(null);
    setCompileErrorLine(null);
    setPreviewError(null);
  }, []);

  // ── Cmd+O ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        setPickerOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Persist to URL + localStorage ──
  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentProject) {
      url.searchParams.set("project", currentProject);
    } else {
      url.searchParams.delete("project");
    }
    window.history.replaceState(null, "", url.toString());
  }, [currentProject]);

  useEffect(() => {
    localStorage.setItem(LS_RECENT, JSON.stringify(recentProjects));
  }, [recentProjects]);

  const saveDraftsTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (saveDraftsTimeout.current) clearTimeout(saveDraftsTimeout.current);
    saveDraftsTimeout.current = setTimeout(() => {
      localStorage.setItem(LS_DRAFTS, JSON.stringify(projectStates));
    }, 500);
  }, [projectStates]);

  // ── Auto-sync project from URL on mount ──
  const hasAutoSynced = useRef(false);
  useEffect(() => {
    if (hasAutoSynced.current) return;
    if (!currentProject) return;
    if (projects === undefined) return;
    if (!projects.some((p) => p.slug === currentProject)) return;
    hasAutoSynced.current = true;
    setSyncing(true);
    syncProject({ slug: currentProject })
      .catch((e) => console.error("Auto-sync failed:", e))
      .finally(() => setSyncing(false));
  }, [currentProject, projects, syncProject]);

  // ── Auto-discover repos when DB is empty ──
  const hasAutoDiscovered = useRef(false);
  useEffect(() => {
    if (hasAutoDiscovered.current) return;
    if (projects === undefined) return; // still loading
    if (projects.length > 0) return; // already have projects
    hasAutoDiscovered.current = true;
    setDiscovering(true);
    discoverRepos({})
      .catch((e) => console.error("Auto-discover failed:", e))
      .finally(() => setDiscovering(false));
  }, [projects, discoverRepos]);

  const handleRefreshRepos = useCallback(async () => {
    setDiscovering(true);
    try {
      await discoverRepos({});
    } catch (e) {
      console.error("Discover failed:", e);
    } finally {
      setDiscovering(false);
    }
  }, [discoverRepos]);

  // ── Compilation ──
  const doCompile = useCallback(async (value: string) => {
    // Claim a fresh generation id; any compile already in flight
    // becomes a "stale" generation and its result will be dropped.
    const myGen = ++compileGenRef.current;
    setStatus("compiling");
    // Plain async function — no `startTransition`. With React 19 +
    // Next 16's dev rendering indicator, wrapping a long-running
    // async server action in `startTransition` introduced concurrent
    // re-renders of Next's Router on rapid invocations, which in turn
    // produced "Rendered more hooks than during the previous render"
    // failures inside `useAppDevRenderingIndicator`. We manage our
    // own pending state via `status`, so we don't need a transition.
    let result: CompileActionResult;
    try {
      result = await compileAction(value);
    } catch (err) {
      // compileAction never throws normally; this catches network
      // / serialization failures so they don't surface as unhandled
      // promise rejections.
      if (myGen !== compileGenRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setCompileErrorLine(null);
      setPreviewError(null);
      setStatus("error");
      return;
    }
    // If the user typed / switched tabs while we were awaiting,
    // a newer compile has already started. Drop this result so we
    // don't briefly flash old output before the newer one lands.
    if (myGen !== compileGenRef.current) return;
    // Source-position metadata is the same shape on success and
    // failure — keep it in sync so editor highlighting stays
    // accurate while the user fixes a compile error.
    setVirtualPath(result.virtualPath ?? null);
    setFrontmatterLines(result.frontmatterLines ?? 0);
    if (result.success) {
      setCompiled(result.compiled ?? null);
      setToc(result.toc ?? []);
      setDiagnosticsCount(result.diagnostics?.length ?? 0);
      setError(null);
      setCompileErrorLine(null);
      setStatus("success");
    } else {
      setError(result.error ?? "Unknown error");
      // MDX errors report a line within the post-frontmatter source.
      // Add the offset so the editor highlights the right line.
      const reportedLine = result.errorLine;
      setCompileErrorLine(
        typeof reportedLine === "number"
          ? reportedLine + (result.frontmatterLines ?? 0)
          : null,
      );
      // A failing compile invalidates any previous render error —
      // we don't have a compiled module to render anymore.
      setPreviewError(null);
      setStatus("error");
    }
  }, []);

  // Read the latest `activeContent` from a ref inside the tab-switch
  // effect — depending on `activeContent` directly would re-fire the
  // effect on every keystroke (since the string reference changes),
  // bypassing the debounced compile path used by `handleBodyChange`.
  const activeContentRef = useRef(activeContent);
  activeContentRef.current = activeContent;

  // Recompile when the user switches to a different tab. Without this,
  // re-selecting an already-open tab would leave `compiled` pointing
  // at the *previous* tab's source, and the preview would briefly
  // render that stale output against the new tab's resetKey — exactly
  // the race that produced the "Rendered more hooks" failure when
  // users switched tabs quickly.
  useEffect(() => {
    // Cancel any pending debounced compile from the previous tab.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Drop any in-flight async compile too (its result is for a
    // different tab now).
    compileGenRef.current++;
    setCompiled(null);
    setError(null);
    setCompileErrorLine(null);
    setPreviewError(null);

    if (!activeTabId) {
      setToc([]);
      setStatus("idle");
      return;
    }

    // Compile the new tab's current source.
    doCompile(activeContentRef.current);
  }, [activeTabId, doCompile]);

  /** Update full source (frontmatter + body). Used by FrontmatterPanel. */
  const handleFullSourceChange = useCallback(
    (value: string) => {
      if (!activeTabId) return;
      updatePS((ps) => ({
        ...ps,
        tabContents: { ...ps.tabContents, [activeTabId]: value },
        tabs: ps.tabs.map((t) =>
          t.id === activeTabId ? { ...t, modified: true } : t,
        ),
      }));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doCompile(value), DEBOUNCE_MS);
    },
    [activeTabId, doCompile, updatePS],
  );

  /** Update only the body (editor area). Prepends existing frontmatter. */
  const handleBodyChange = useCallback(
    (body: string) => {
      if (!activeTabId) return;
      // Read current frontmatter from stored content
      const current =
        projectStates[currentProject!]?.tabContents[activeTabId] ?? "";
      const { frontmatter } = splitFrontmatter(current);
      const full = frontmatter + body;
      updatePS((ps) => ({
        ...ps,
        tabContents: { ...ps.tabContents, [activeTabId]: full },
        tabs: ps.tabs.map((t) =>
          t.id === activeTabId ? { ...t, modified: true } : t,
        ),
      }));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doCompile(full), DEBOUNCE_MS);
    },
    [activeTabId, currentProject, projectStates, doCompile, updatePS],
  );

  // ── Tab actions ──
  const openFileTab = useCallback(
    async (articleSlug: string) => {
      if (!currentProject) return;
      const tabId = createTabId("article", currentProject, articleSlug);

      // If tab already open, just switch
      const existing = projectStates[currentProject];
      if (existing?.tabs.some((t) => t.id === tabId)) {
        updatePS((ps) => ({ ...ps, activeTabId: tabId }));
        return;
      }

      // Fetch file from GitHub via Convex
      const newTab: OpenTab = {
        id: tabId,
        type: "article",
        subjectSlug: currentProject,
        articleSlug,
        label: `${getArticleTitle(articleSlug)}.mdx`,
        modified: false,
      };

      // Add tab in loading state
      updatePS((ps) => ({
        ...ps,
        tabs: [...ps.tabs, { ...newTab, loading: true }],
        activeTabId: tabId,
        tabContents: { ...ps.tabContents, [tabId]: "" },
      }));

      try {
        const content = await fetchFile({
          slug: currentProject,
          path: articlePath(articleSlug),
        });
        updatePS((ps) => ({
          ...ps,
          tabs: ps.tabs.map((t) =>
            t.id === tabId ? { ...t, loading: false } : t,
          ),
          tabContents: { ...ps.tabContents, [tabId]: content },
        }));
        // Compile after content arrives
        doCompile(content);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Failed to fetch file";
        updatePS((ps) => ({
          ...ps,
          tabs: ps.tabs.map((t) =>
            t.id === tabId ? { ...t, loading: false } : t,
          ),
          tabContents: {
            ...ps.tabContents,
            [tabId]: `# Error\n\n${errMsg}`,
          },
        }));
        doCompile(`# Error\n\n${errMsg}`);
      }
    },
    [currentProject, projectStates, fetchFile, updatePS, doCompile],
  );

  const openMetadataTab = useCallback(() => {
    if (!currentProject) return;
    const tabId = createTabId("metadata", currentProject);
    updatePS((ps) => {
      if (ps.tabs.some((t) => t.id === tabId))
        return { ...ps, activeTabId: tabId };
      return {
        ...ps,
        tabs: [
          ...ps.tabs,
          {
            id: tabId,
            type: "metadata",
            subjectSlug: currentProject,
            label: "Settings",
            modified: false,
          },
        ],
        activeTabId: tabId,
      };
    });
  }, [currentProject, updatePS]);

  const closeTab = useCallback(
    (tabId: string) => {
      updatePS((ps) => {
        const idx = ps.tabs.findIndex((t) => t.id === tabId);
        const next = ps.tabs.filter((t) => t.id !== tabId);
        let newActive = ps.activeTabId;
        if (tabId === ps.activeTabId) {
          newActive =
            next.length > 0 ? next[Math.min(idx, next.length - 1)].id : null;
        }
        const { [tabId]: _, ...rest } = ps.tabContents;
        return { tabs: next, activeTabId: newActive, tabContents: rest };
      });
    },
    [updatePS],
  );

  const selectTab = useCallback(
    (tabId: string) => {
      updatePS((ps) => ({ ...ps, activeTabId: tabId }));
    },
    [updatePS],
  );

  // Compile on tab switch (and on initial mount with restored tab)
  const lastCompiledTab = useRef<string | null>(null);
  useEffect(() => {
    if (!activeTab || activeTab.type !== "article" || activeTab.loading) return;
    if (!activeTabId || !tabContents[activeTabId]) return;
    if (lastCompiledTab.current === activeTabId) return;
    lastCompiledTab.current = activeTabId;
    doCompile(tabContents[activeTabId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, activeTab?.loading]);

  // ── Drag handlers ──
  const handleEditorDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPos(
        Math.min(
          80,
          Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100),
        ),
      );
    };
    const handleUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, []);

  const handleSidebarDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const handleMove = (ev: MouseEvent) =>
        setSidebarWidth(
          Math.min(400, Math.max(180, startWidth + ev.clientX - startX)),
        );
      const handleUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [sidebarWidth],
  );

  // ── Scroll sync ──
  const handleEditorScroll = useCallback(
    (fraction: number) => {
      if (!scrollSync || scrollingFrom.current === "preview") return;
      scrollingFrom.current = "editor";
      const el = previewRef.current;
      if (el) {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTop = fraction * max;
      }
      requestAnimationFrame(() => {
        scrollingFrom.current = null;
      });
    },
    [scrollSync],
  );

  const handlePreviewScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!scrollSync || scrollingFrom.current === "editor") return;
      scrollingFrom.current = "preview";
      const el = e.currentTarget;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) {
        editorRef.current?.scrollToFraction(el.scrollTop / max);
      }
      requestAnimationFrame(() => {
        scrollingFrom.current = null;
      });
    },
    [scrollSync],
  );

  const handleInsertComponent = useCallback((snippet: string) => {
    editorRef.current?.insertAtCursor("\n" + snippet + "\n");
  }, []);

  const handleMetadataUpdate = useCallback((_updated: Subject) => {
    // TODO: persist to Convex → commit to GitHub
  }, []);

  const lineCount = activeBody.split("\n").length;

  // ════════════════════════════════
  //  No project → Welcome
  // ════════════════════════════════
  if (!currentProject) {
    return (
      <div
        className="flex flex-col h-screen"
        style={{ backgroundColor: "var(--background)" }}
      >
        <WelcomeHeader
          resolvedTheme={resolvedTheme}
          toggleTheme={toggleTheme}
        />

        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ backgroundColor: C.bgWhite }}
        >
          <div className="w-full max-w-md px-8 text-center">
            <div
              className="text-[56px] leading-none mb-6"
              style={{
                fontFamily: "var(--font-mono)",
                color: C.textMuted,
                opacity: 0.12,
              }}
            >
              &#x25C7;
            </div>

            <Button
              type="button"
              onClick={() => setPickerOpen(true)}
              variant="primary"
              size="lg"
              className="tracking-[0.12em] mb-4"
              style={{
                backgroundColor: C.accent,
                borderColor: C.accent,
                color: "#fff",
              }}
            >
              Open project
            </Button>

            <div
              className="text-[9px] tracking-wider mb-6"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              or press <Kbd className="text-[9px]">&#x2318;O</Kbd>
            </div>

            {/* Loading / discover state */}
            {projects === undefined || discovering ? (
              <div
                className="text-[10px] tracking-wider"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: C.textMuted,
                }}
              >
                {discovering
                  ? "Discovering repos from GitHub\u2026"
                  : "Loading projects\u2026"}
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleRefreshRepos}
                variant="outline"
                size="sm"
                className="text-[9px] tracking-[0.1em] mt-2 hover:opacity-100"
                style={{ color: C.textMuted, borderColor: C.borderLight }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.accent;
                  e.currentTarget.style.borderColor = C.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = C.textMuted;
                  e.currentTarget.style.borderColor = C.borderLight;
                }}
              >
                Refresh repos
              </Button>
            )}

            {/* Recent projects */}
            {recentProjects.length > 0 && projects && (
              <div className="mt-4">
                <div
                  className="text-[8px] font-bold uppercase tracking-[0.2em] mb-3"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: C.textMuted,
                  }}
                >
                  Recent
                </div>
                <div className="space-y-1">
                  {recentProjects.map((slug) => {
                    const p = projects.find((pr) => pr.slug === slug);
                    if (!p) return null;
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => openProject(slug)}
                        className="w-full text-left px-4 py-2.5 border cursor-pointer transition-colors"
                        style={{
                          borderColor: C.borderLight,
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = C.accent;
                          e.currentTarget.style.backgroundColor = C.bg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = C.borderLight;
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div
                          className="text-[11px] font-semibold"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: C.text,
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          className="text-[9px] mt-0.5"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: C.textMuted,
                          }}
                        >
                          {p.githubRepo}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <StatusBar status="idle" lineCount={0} />

        <AnimatePresence>
          {pickerOpen && projects && (
            <ProjectPicker
              projects={projects}
              recentSlugs={recentProjects}
              currentSlug={null}
              onSelect={openProject}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════
  //  Project open → IDE
  // ════════════════════════════════
  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Header */}
      <header
        className="h-11 flex items-center justify-between px-4 border-b shrink-0"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[13px] font-bold uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            Wikipefia Studio
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              color: C.headerText,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            }}
          >
            <span
              className="text-[10px] font-medium truncate max-w-[200px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {subject?.name.en ?? currentProjectData?.name ?? currentProject}
            </span>
            <span className="text-[9px] opacity-50">&#x25BE;</span>
          </button>
          {syncing && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-mono)", color: C.accent }}
            >
              Syncing\u2026
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 px-2 py-1"
            >
              <span
                className="w-1.5 h-1.5"
                style={{
                  backgroundColor:
                    status === "success"
                      ? "#059669"
                      : status === "error"
                        ? "#DC2626"
                        : status === "compiling"
                          ? C.accent
                          : C.textMuted,
                }}
              />
            </motion.div>
          </AnimatePresence>
          <button
            type="button"
            onClick={toggleTheme}
            className="h-[30px] w-[30px] flex items-center justify-center border cursor-pointer transition-colors"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              color: C.headerText,
            }}
          >
            <span className="text-[14px]">
              {resolvedTheme === "dark" ? "\u2600" : "\u263E"}
            </span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="shrink-0 w-9 flex flex-col items-center justify-start pt-3 gap-2 border-r cursor-pointer transition-colors"
            style={{
              borderColor: C.borderLight,
              backgroundColor: C.bg,
              color: C.textMuted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = C.bgWhite;
              e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = C.bg;
              e.currentTarget.style.color = C.textMuted;
            }}
          >
            <span
              className="text-[12px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              &#x203A;
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{
                fontFamily: "var(--font-mono)",
                writingMode: "vertical-lr",
              }}
            >
              Files
            </span>
          </button>
        ) : subject ? (
          <>
            <div
              className="shrink-0 min-h-0"
              style={{
                width: sidebarWidth,
                borderRight: `1px solid ${C.borderLight}`,
              }}
            >
              <Sidebar
                subject={subject}
                activeTabId={activeTabId}
                onOpenFile={openFileTab}
                onOpenMetadata={openMetadataTab}
                onCollapse={() => setSidebarCollapsed(true)}
                onCloseProject={closeProject}
              />
            </div>
            <div
              onMouseDown={handleSidebarDragStart}
              className="w-[4px] shrink-0 cursor-col-resize relative group"
              style={{ backgroundColor: C.borderLight }}
            >
              <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[var(--c-accent)] group-hover:opacity-30 transition-all" />
            </div>
          </>
        ) : (
          <div
            className="shrink-0 flex items-center justify-center border-r"
            style={{
              width: sidebarWidth,
              borderColor: C.borderLight,
              backgroundColor: C.bg,
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              {syncing ? "Syncing\u2026" : "Loading\u2026"}
            </span>
          </div>
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={selectTab}
            onCloseTab={closeTab}
          />

          {activeTab ? (
            activeTab.loading ? (
              <div
                className="flex-1 flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: C.bgWhite }}
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-mono)", color: C.accent }}
                >
                  Fetching from GitHub&hellip;
                </span>
                <span
                  className="text-[9px] tracking-wider"
                  style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
                >
                  {activeTab.label}
                </span>
              </div>
            ) : activeTab.type === "metadata" && subject ? (
              <MetadataPanel
                subject={subject}
                onUpdate={handleMetadataUpdate}
              />
            ) : (
              <div className="flex flex-1 min-h-0">
                {/* Component menu */}
                <div className="flex shrink-0 min-h-0">
                  {menuOpen && (
                    <div style={{ width: 220 }} className="min-h-0">
                      <ComponentMenu onInsert={handleInsertComponent} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="shrink-0 w-7 flex flex-col items-center justify-start pt-3 gap-1.5 cursor-pointer transition-colors border-r"
                    style={{
                      borderColor: C.borderLight,
                      backgroundColor: C.bg,
                      color: menuOpen ? C.accent : C.textMuted,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = C.bgWhite;
                      if (!menuOpen) e.currentTarget.style.color = C.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = C.bg;
                      e.currentTarget.style.color = menuOpen
                        ? C.accent
                        : C.textMuted;
                    }}
                  >
                    <span
                      className="text-[10px]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {menuOpen ? "\u2039" : "+"}
                    </span>
                    <span
                      className="text-[8px] font-bold uppercase tracking-[0.08em]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        writingMode: "vertical-lr",
                      }}
                    >
                      Components
                    </span>
                  </button>
                </div>

                {/* Editor column: frontmatter panel + editor/preview split */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                  <FrontmatterPanel
                    source={activeContent}
                    onSourceChange={handleFullSourceChange}
                  />
                  <div ref={containerRef} className="flex flex-1 min-h-0">
                    <div
                      className="min-h-0 overflow-hidden"
                      style={{
                        width: `${splitPos}%`,
                        backgroundColor: C.bgWhite,
                      }}
                    >
                      <CodeEditor
                        ref={editorRef}
                        value={activeBody}
                        onChange={handleBodyChange}
                        onScrollFraction={handleEditorScroll}
                        errorLine={editorErrorLine}
                        errorMessage={editorErrorMessage}
                      />
                    </div>
                    <div
                      onMouseDown={handleEditorDragStart}
                      className="w-[5px] shrink-0 cursor-col-resize relative group"
                      style={{ backgroundColor: C.borderLight }}
                    >
                      <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[var(--c-accent)] group-hover:opacity-30 transition-all" />
                    </div>
                    <div
                      ref={previewRef}
                      onScroll={handlePreviewScroll}
                      className="flex-1 min-h-0 overflow-auto"
                      style={{ backgroundColor: C.bgWhite }}
                    >
                      {/*
                        Keying the preview by `activeTabId` makes a
                        tab switch a hard remount: the boundary, its
                        useState slots, the in-flight evaluate effect,
                        and the React Compiler's memo cache for the
                        subtree are all discarded. Without this, an
                        evaluate-in-flight from tab A could resolve
                        and call setState while we're already on tab
                        B's first render — which is precisely the
                        "renders interleaving across tabs" pattern
                        that produced the freezes & hook errors.
                      */}
                      <LivePreview
                        key={activeTabId ?? "no-tab"}
                        compiled={compiled}
                        virtualPath={virtualPath}
                        frontmatterLines={frontmatterLines}
                        onPreviewError={setPreviewError}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ backgroundColor: C.bgWhite }}
            >
              <div
                className="text-[48px] leading-none mb-4"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: C.textMuted,
                  opacity: 0.15,
                }}
              >
                &#x25C7;
              </div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
              >
                Open a file from the sidebar
              </p>
            </div>
          )}
        </div>
      </div>

      <StatusBar
        status={status}
        error={error}
        diagnosticsCount={diagnosticsCount}
        lineCount={activeTab?.type === "article" ? lineCount : 0}
        scrollSync={scrollSync}
        onToggleScrollSync={
          activeTab?.type === "article"
            ? () => setScrollSync((v) => !v)
            : undefined
        }
      />

      <AnimatePresence>
        {pickerOpen && projects && (
          <ProjectPicker
            projects={projects}
            recentSlugs={recentProjects}
            currentSlug={currentProject}
            onSelect={openProject}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WelcomeHeader({
  resolvedTheme,
  toggleTheme,
}: {
  resolvedTheme: string;
  toggleTheme: () => void;
}) {
  return (
    <header
      className="h-11 flex items-center justify-between px-4 border-b shrink-0"
      style={{ borderColor: C.border, backgroundColor: C.headerBg }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-[13px] font-bold uppercase tracking-[0.08em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          Wikipefia Studio
        </span>
        <Badge variant="accent" className="text-[9px] tracking-[0.15em]">
          MDX Editor
        </Badge>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="h-[30px] w-[30px] flex items-center justify-center border cursor-pointer transition-colors"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          color: C.headerText,
        }}
      >
        <span className="text-[14px]">
          {resolvedTheme === "dark" ? "\u2600" : "\u263E"}
        </span>
      </button>
    </header>
  );
}
