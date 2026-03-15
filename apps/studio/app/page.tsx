"use client";

import { useState, useCallback, useRef, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { compileAction, type CompileActionResult } from "@/app/actions/compile";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/code-editor";
import { LivePreview } from "@/components/editor/live-preview";
import { StatusBar, type CompileStatus } from "@/components/editor/status-bar";
import { ComponentMenu } from "@/components/editor/component-menu";
import { useTheme } from "@/components/shared/theme-provider";
import { C } from "@/lib/theme";
import { DEFAULT_CONTENT } from "@/lib/default-content";

const DEBOUNCE_MS = 350;

export default function EditorPage() {
  const { toggleTheme, resolvedTheme } = useTheme();
  const [source, setSource] = useState(DEFAULT_CONTENT);
  const [compiled, setCompiled] = useState<string | null>(null);
  const [toc, setToc] = useState<CompileActionResult["toc"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticsCount, setDiagnosticsCount] = useState(0);
  const [status, setStatus] = useState<CompileStatus>("idle");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [splitPos, setSplitPos] = useState(50);
  const [menuOpen, setMenuOpen] = useState(true);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

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
    [startTransition]
  );

  const handleChange = useCallback(
    (value: string) => {
      setSource(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doCompile(value);
      }, DEBOUNCE_MS);
    },
    [doCompile]
  );

  useEffect(() => {
    doCompile(DEFAULT_CONTENT);
  }, [doCompile]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
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

  const handleInsertComponent = useCallback(
    (snippet: string) => {
      editorRef.current?.insertAtCursor("\n" + snippet + "\n");
    },
    []
  );

  const lineCount = source.split("\n").length;

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <header
        className="h-12 flex items-center justify-between px-4 border-b shrink-0"
        style={{
          borderColor: C.border,
          backgroundColor: C.headerBg,
        }}
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

        <div className="flex items-center gap-2">
          {/* Compile status indicator in header */}
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

          {/* Theme toggle */}
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
              {resolvedTheme === "dark" ? "☀" : "☾"}
            </span>
          </button>
        </div>
      </header>

      {/* Panel labels */}
      <div
        className="flex shrink-0 border-b"
        style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
      >
        <div
          className="flex items-center justify-between px-4 h-8 border-r"
          style={{ width: `${splitPos}%`, borderColor: C.borderLight }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            ■ Editor
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 cursor-pointer transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              color: menuOpen ? C.accent : C.textMuted,
              border: `1px solid ${menuOpen ? C.accent : C.borderLight}`,
            }}
          >
            + Components
          </button>
        </div>
        <div className="flex items-center px-4 h-8">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            ■ Preview
          </span>
        </div>
      </div>

      {/* Editor + Preview split */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Editor panel */}
        <div
          className="flex min-h-0"
          style={{
            width: `${splitPos}%`,
            backgroundColor: C.bgWhite,
          }}
        >
          {menuOpen && (
            <div
              className="shrink-0 min-h-0"
              style={{ width: 220 }}
            >
              <ComponentMenu onInsert={handleInsertComponent} />
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor ref={editorRef} value={source} onChange={handleChange} />
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          className="w-[5px] shrink-0 cursor-col-resize relative group"
          style={{ backgroundColor: C.borderLight }}
        >
          <div
            className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[var(--c-accent)] group-hover:opacity-30 transition-all"
          />
        </div>

        {/* Preview panel */}
        <div
          className="flex-1 min-h-0 overflow-auto"
          style={{ backgroundColor: C.bgWhite }}
        >
          <LivePreview compiled={compiled} toc={toc} />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        status={status}
        error={error}
        diagnosticsCount={diagnosticsCount}
        lineCount={lineCount}
      />
    </div>
  );
}
