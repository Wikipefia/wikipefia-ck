"use client";

import {
  useState,
  useCallback,
  useRef,
  useTransition,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  compileAction,
  type CompileActionResult,
} from "@/app/actions/compile";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "@/components/editor/code-editor";
import { LivePreview } from "@/components/editor/live-preview";
import {
  StatusBar,
  type CompileStatus,
} from "@/components/editor/status-bar";
import { ComponentMenu } from "@/components/editor/component-menu";
import { Sidebar } from "@/components/workspace/sidebar";
import { TabBar } from "@/components/workspace/tab-bar";
import { MetadataPanel } from "@/components/workspace/metadata-panel";
import { ProjectPicker } from "@/components/workspace/project-picker";
import { useTheme } from "@/components/shared/theme-provider";
import { C } from "@/lib/theme";
import {
  MOCK_SUBJECTS,
  type OpenTab,
  type Subject,
  getArticleContent,
  getArticleTitle,
  getSubject,
  createTabId,
} from "@/lib/mock-data";

const DEBOUNCE_MS = 350;

/** Per-project workspace snapshot */
interface ProjectState {
  tabs: OpenTab[];
  activeTabId: string | null;
  tabContents: Record<string, string>;
}

export default function EditorPage() {
  const { toggleTheme, resolvedTheme } = useTheme();

  // ── Project state ──
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [projectStates, setProjectStates] = useState<
    Record<string, ProjectState>
  >({});

  // ── Editor state ──
  const [compiled, setCompiled] = useState<string | null>(null);
  const [toc, setToc] = useState<CompileActionResult["toc"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticsCount, setDiagnosticsCount] = useState(0);
  const [status, setStatus] = useState<CompileStatus>("idle");
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Layout state ──
  const [splitPos, setSplitPos] = useState(50);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

  // ── Derived ──
  const subject = currentProject ? getSubject(currentProject) : undefined;
  const ps = currentProject ? projectStates[currentProject] : undefined;
  const tabs = ps?.tabs ?? [];
  const activeTabId = ps?.activeTabId ?? null;
  const tabContents = ps?.tabContents ?? {};
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeContent = activeTabId ? (tabContents[activeTabId] ?? "") : "";

  // ── Helpers to update per-project state ──
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
    (slug: string) => {
      setCurrentProject(slug);
      setRecentProjects((prev) => [
        slug,
        ...prev.filter((s) => s !== slug),
      ]);
      setPickerOpen(false);
      setSidebarCollapsed(false);
      // Init state if first time
      setProjectStates((all) => {
        if (all[slug]) return all;
        return {
          ...all,
          [slug]: { tabs: [], activeTabId: null, tabContents: {} },
        };
      });
      // Reset compile state
      setCompiled(null);
      setStatus("idle");
      setError(null);
    },
    [],
  );

  const closeProject = useCallback(() => {
    setCurrentProject(null);
    setCompiled(null);
    setStatus("idle");
    setError(null);
  }, []);

  // ── Keyboard shortcut: Cmd+O opens picker ──
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

  // ── Compilation ──
  const doCompile = useCallback(
    (value: string) => {
      setStatus("compiling");
      startTransition(async () => {
        const result = await compileAction(value);
        if (result.success) {
          setCompiled(result.compiled ?? null);
          setToc(result.toc ?? []);
          setDiagnosticsCount(result.diagnostics?.length ?? 0);
          setError(null);
          setStatus("success");
        } else {
          setError(result.error ?? "Unknown error");
          setStatus("error");
        }
      });
    },
    [startTransition],
  );

  const handleChange = useCallback(
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

  // ── Tab actions ──
  const openFile = useCallback(
    (articleSlug: string) => {
      if (!currentProject) return;
      const tabId = createTabId("article", currentProject, articleSlug);
      updatePS((ps) => {
        if (ps.tabs.some((t) => t.id === tabId))
          return { ...ps, activeTabId: tabId };
        const content = getArticleContent(currentProject, articleSlug);
        return {
          ...ps,
          tabs: [
            ...ps.tabs,
            {
              id: tabId,
              type: "article",
              subjectSlug: currentProject,
              articleSlug,
              label: `${getArticleTitle(articleSlug)}.mdx`,
              modified: false,
            },
          ],
          activeTabId: tabId,
          tabContents: { ...ps.tabContents, [tabId]: content },
        };
      });
    },
    [currentProject, updatePS],
  );

  const openMetadata = useCallback(() => {
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
          if (next.length > 0) {
            newActive = next[Math.min(idx, next.length - 1)].id;
          } else {
            newActive = null;
          }
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

  // Compile on tab switch
  useEffect(() => {
    if (!activeTab || activeTab.type !== "article") return;
    if (activeTabId && tabContents[activeTabId]) {
      doCompile(tabContents[activeTabId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // ── Drag handlers ──
  const handleEditorDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(80, Math.max(20, pct)));
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

      const handleMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        setSidebarWidth(Math.min(400, Math.max(180, startWidth + delta)));
      };

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

  const handleInsertComponent = useCallback((snippet: string) => {
    editorRef.current?.insertAtCursor("\n" + snippet + "\n");
  }, []);

  const handleMetadataUpdate = useCallback((_updated: Subject) => {
    // Persist to Convex/GitHub in the future.
  }, []);

  const lineCount = activeContent.split("\n").length;

  // ════════════════════════════════════════
  // No project open → Welcome screen
  // ════════════════════════════════════════
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

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] cursor-pointer transition-colors mb-6"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: C.accent,
                color: "#fff",
              }}
            >
              Open project
            </button>

            <div
              className="text-[9px] tracking-wider mb-6"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              or press{" "}
              <kbd
                className="px-1.5 py-0.5 border text-[9px]"
                style={{
                  borderColor: C.borderLight,
                  fontFamily: "var(--font-mono)",
                }}
              >
                &#x2318;O
              </kbd>
            </div>

            {/* Recent projects */}
            {recentProjects.length > 0 && (
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
                    const s = getSubject(slug);
                    if (!s) return null;
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
                          {s.name.en}
                        </div>
                        <div
                          className="text-[9px] mt-0.5"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: C.textMuted,
                          }}
                        >
                          {s.metadata.credits} cr &middot; Semester{" "}
                          {s.metadata.semester} &middot;{" "}
                          {s.categories.reduce(
                            (n, c) => n + c.articles.length,
                            0,
                          )}{" "}
                          articles
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
          {pickerOpen && (
            <ProjectPicker
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

  // ════════════════════════════════════════
  // Project open → IDE layout
  // ════════════════════════════════════════
  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* ── Header ── */}
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

          {/* Current project — click to switch */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer transition-colors"
            style={{
              border: `1px solid rgba(255,255,255,0.15)`,
              color: C.headerText,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            }}
            title="Switch project (&#x2318;O)"
          >
            <span
              className="text-[10px] font-medium truncate max-w-[200px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {subject?.name.en}
            </span>
            <span className="text-[9px] opacity-50">&#x25BE;</span>
          </button>
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
            title="Toggle theme"
          >
            <span className="text-[14px]">
              {resolvedTheme === "dark" ? "\u2600" : "\u263E"}
            </span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — full or collapsed strip */}
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
            title="Expand sidebar"
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
        ) : (
          <>
            <div
              className="shrink-0 min-h-0"
              style={{
                width: sidebarWidth,
                borderRight: `1px solid ${C.borderLight}`,
              }}
            >
              <Sidebar
                subject={subject!}
                activeTabId={activeTabId}
                onOpenFile={openFile}
                onOpenMetadata={openMetadata}
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
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={selectTab}
            onCloseTab={closeTab}
          />

          {/* Content */}
          {activeTab ? (
            activeTab.type === "metadata" ? (
              <MetadataPanel
                subject={subject!}
                onUpdate={handleMetadataUpdate}
              />
            ) : (
              <div className="flex flex-1 min-h-0">
                {/* Component menu toggle + panel */}
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
                    title={
                      menuOpen
                        ? "Hide component menu"
                        : "Show component menu"
                    }
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

                {/* Editor + Preview split (ref for drag calc) */}
                <div ref={containerRef} className="flex flex-1 min-h-0">
                  {/* Editor panel */}
                  <div
                    className="min-h-0 overflow-hidden"
                    style={{
                      width: `${splitPos}%`,
                      backgroundColor: C.bgWhite,
                    }}
                  >
                    <CodeEditor
                      ref={editorRef}
                      value={activeContent}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Editor / Preview drag handle */}
                  <div
                    onMouseDown={handleEditorDragStart}
                    className="w-[5px] shrink-0 cursor-col-resize relative group"
                    style={{ backgroundColor: C.borderLight }}
                  >
                    <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[var(--c-accent)] group-hover:opacity-30 transition-all" />
                  </div>

                  {/* Preview panel */}
                  <div
                    className="flex-1 min-h-0 overflow-auto"
                    style={{ backgroundColor: C.bgWhite }}
                  >
                    <LivePreview compiled={compiled} toc={toc} />
                  </div>
                </div>
              </div>
            )
          ) : (
            /* No tabs open */
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
                style={{
                  fontFamily: "var(--font-mono)",
                  color: C.textMuted,
                }}
              >
                Open a file from the sidebar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Status bar ── */}
      <StatusBar
        status={status}
        error={error}
        diagnosticsCount={diagnosticsCount}
        lineCount={activeTab?.type === "article" ? lineCount : 0}
      />

      {/* ── Project picker overlay ── */}
      <AnimatePresence>
        {pickerOpen && (
          <ProjectPicker
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

/** Shared header for the welcome screen (no project context) */
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
        <span
          className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5"
          style={{
            color: C.accent,
            border: `1px solid ${C.accent}`,
            fontFamily: "var(--font-mono)",
          }}
        >
          MDX Editor
        </span>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="h-[30px] w-[30px] flex items-center justify-center border cursor-pointer transition-colors"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          color: C.headerText,
        }}
        title="Toggle theme"
      >
        <span className="text-[14px]">
          {resolvedTheme === "dark" ? "\u2600" : "\u263E"}
        </span>
      </button>
    </header>
  );
}
