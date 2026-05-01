"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { run, type RunOptions } from "@mdx-js/mdx";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import { mdxComponents } from "@/lib/mdx-components";
import { C } from "@/lib/theme";
import {
  toPreviewError,
  type PreviewError,
} from "@/lib/preview-error";

interface LivePreviewProps {
  compiled: string | null;
  /** Virtual file path the compiler used (drives source-map matching). */
  virtualPath?: string | null;
  /** Editor lines that were stripped as frontmatter before compile. */
  frontmatterLines?: number | null;
  /** Notified whenever the live error state changes (including clearing). */
  onPreviewError?: (error: PreviewError | null) => void;
}

// ── Error UI ─────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<PreviewError["stage"], string> = {
  compile: "COMPILE ERROR",
  evaluate: "EVALUATION ERROR",
  render: "RENDER ERROR",
};

function PreviewErrorPanel({ error }: { error: PreviewError }) {
  const [showDetails, setShowDetails] = useState(false);
  const stageLabel = STAGE_LABELS[error.stage];
  const locationLabel = error.location
    ? `Line ${error.location.line}${error.location.column ? `, column ${error.location.column}` : ""}`
    : null;

  return (
    <div className="p-6">
      <div className="border-2 mb-4" style={{ borderColor: "#DC2626" }}>
        <div
          className="px-4 py-2.5 border-b-2 flex items-center justify-between gap-4"
          style={{ borderColor: "#DC2626", backgroundColor: "#DC2626" }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
          >
            ■ {stageLabel}
          </span>
          {locationLabel && (
            <span
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-mono)", color: "#fff", opacity: 0.85 }}
            >
              {locationLabel}
            </span>
          )}
        </div>

        <div
          className="p-4 text-[13px] leading-[1.7]"
          style={{ fontFamily: "var(--font-editor)", color: C.text }}
        >
          {error.name && error.name !== "Error" && (
            <div
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
              style={{ fontFamily: "var(--font-mono)", color: "#DC2626" }}
            >
              {error.name}
            </div>
          )}
          <pre className="whitespace-pre-wrap break-words">{error.message}</pre>

          {(error.stack || error.componentStack) && (
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] cursor-pointer underline"
              style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          )}

          {showDetails && (
            <div className="mt-3 space-y-3">
              {error.componentStack && (
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
                    style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
                  >
                    Component stack
                  </div>
                  <pre
                    className="whitespace-pre-wrap break-words text-[11px] p-2 border"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: C.textMuted,
                      borderColor: C.borderLight,
                      backgroundColor: C.bg,
                    }}
                  >
                    {error.componentStack.trim()}
                  </pre>
                </div>
              )}
              {error.stack && (
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
                    style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
                  >
                    Stack
                  </div>
                  <pre
                    className="whitespace-pre-wrap break-words text-[11px] p-2 border"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: C.textMuted,
                      borderColor: C.borderLight,
                      backgroundColor: C.bg,
                    }}
                  >
                    {error.stack.trim()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Render error boundary ────────────────────────────────────────────────
//
// Class component because that's the only API React exposes for catching
// synchronous errors thrown during a render. Two non-obvious decisions:
//
// • `getDerivedStateFromProps` (rather than `componentDidUpdate`) handles
//   the resetKey reset, so a persistent error doesn't ping-pong through
//   catch → reset → catch.
//
// • `componentDidCatch` defers the parent-callback to a microtask. The
//   commit phase that ran the failing render is *currently still on the
//   stack* when `componentDidCatch` fires, and a synchronous parent
//   setState here can interleave with React's own reconciliation in
//   sibling subtrees (e.g. Next.js's app-router dev-rendering indicator)
//   and cause the dreaded "Rendered more hooks than during the previous
//   render" failure when the user is rapid-firing renders. Microtask
//   deferral lets the failed commit fully settle first.

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Bumping this between renders resets the boundary's error state. */
  resetKey: unknown;
  onError: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  /** Tracks the resetKey we last rendered for; reset when it changes. */
  lastResetKey: unknown;
}

class RenderErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    lastResetKey: Symbol("init"),
  };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (state.lastResetKey !== props.resetKey) {
      return { hasError: false, lastResetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // See class comment above: defer to microtask so the failed commit
    // fully settles before we touch parent state.
    const { onError } = this.props;
    queueMicrotask(() => {
      try {
        onError(error, info);
      } catch {
        // Swallow — failing while reporting a failure helps no one.
      }
    });
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ── Preview body ─────────────────────────────────────────────────────────

interface PreviewContentProps {
  compiled: string;
  virtualPath: string | null;
  frontmatterLines: number;
  onPreviewError?: (error: PreviewError | null) => void;
}

function PreviewContent({
  compiled,
  virtualPath,
  frontmatterLines,
  onPreviewError,
}: PreviewContentProps) {
  // We track *which* compiled string the current `content` was built from.
  // When `compiled` changes, this lets us synchronously discard stale
  // content during the same render — instead of waiting for the evaluate
  // effect's commit, which would briefly render the previous component
  // against a new resetKey and cause spurious error-boundary churn.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // biome-ignore lint/suspicious/noExplicitAny: MDXContent's prop type is intentionally polymorphic
  const [content, setContent] = useState<{ key: string; Component: ComponentType<any> } | null>(null);
  const [error, setError] = useState<PreviewError | null>(null);

  // Hold the latest parent callback in a ref so we can call it from
  // microtask-deferred error handlers without capturing stale closures.
  const onPreviewErrorRef = useRef(onPreviewError);
  onPreviewErrorRef.current = onPreviewError;

  // Single-source notifier: every place that sets `error` calls this
  // helper, which both updates local state and tells the parent in the
  // same render cycle (batched). This replaces the previous
  // `useEffect(..., [error])` pattern, which fired in a separate commit
  // and could interleave with concurrent updates elsewhere.
  const reportError = useCallback((next: PreviewError | null) => {
    setError(next);
    onPreviewErrorRef.current?.(next);
  }, []);

  // Clear any lingering parent error on unmount (covers the case where
  // the user navigates away while an error is showing).
  useEffect(() => {
    return () => {
      onPreviewErrorRef.current?.(null);
    };
  }, []);

  // Stage 2: evaluate the compiled function-body via run().
  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      try {
        const { default: MDXContent } = await run(compiled, {
          ...(jsxDevRuntime as unknown as RunOptions),
          baseUrl: typeof window !== "undefined" ? window.location.href : "",
        });
        if (cancelled) return;
        setContent({ key: compiled, Component: MDXContent });
        reportError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        reportError(
          toPreviewError(err, "evaluate", {
            compiled,
            virtualPath,
            frontmatterLines,
          }),
        );
        setContent(null);
      }
    }

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [compiled, virtualPath, frontmatterLines, reportError]);

  // If the component-cache is from a different compile than the current
  // `compiled`, treat it as stale: don't render it. The new evaluate
  // effect will replace it. This is the key fix for the rapid-switch
  // race — without it, we'd render the OLD MDXContent under the NEW
  // resetKey and trigger an error-boundary cycle.
  const usableContent =
    content && content.key === compiled ? content.Component : null;

  if (error) return <PreviewErrorPanel error={error} />;

  if (!usableContent) {
    return (
      <div className="flex items-center justify-center h-full">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          Rendering...
        </span>
      </div>
    );
  }

  const MDXContent = usableContent;

  return (
    <RenderErrorBoundary
      resetKey={compiled}
      onError={(err, info) => {
        reportError(
          toPreviewError(err, "render", {
            compiled,
            virtualPath,
            frontmatterLines,
            componentStack: info.componentStack ?? undefined,
          }),
        );
      }}
    >
      <div className="p-8 max-w-4xl mx-auto">
        <div className="prose-wiki" style={{ color: C.text }}>
          <MDXContent components={mdxComponents} />
        </div>
      </div>
    </RenderErrorBoundary>
  );
}

// ── Top-level ────────────────────────────────────────────────────────────

export function LivePreview({
  compiled,
  virtualPath,
  frontmatterLines,
  onPreviewError,
}: LivePreviewProps) {
  if (compiled) {
    return (
      // `key` ties the React fiber to the compile session. Switching
      // tabs/files often produces a fresh `compiled` string and a fresh
      // virtualPath; using `compiled` as a partial key forces a real
      // remount of PreviewContent when the source genuinely changes,
      // so its useState slots and useEffect cleanups run cleanly
      // instead of straddling two compile sessions.
      <PreviewContent
        compiled={compiled}
        virtualPath={virtualPath ?? null}
        frontmatterLines={frontmatterLines ?? 0}
        onPreviewError={onPreviewError}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div
        className="text-[48px] leading-none opacity-10"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        ◇
      </div>
      <span
        className="text-[11px] font-bold uppercase tracking-[0.2em]"
        style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
      >
        Start typing to see preview
      </span>
    </div>
  );
}
