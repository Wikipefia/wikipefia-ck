"use client";

import { useState, Children, type ReactNode } from "react";
import { C } from "../theme";

type AnyElement = { props: Record<string, any> };

interface StepProps {
  title: string;
  children: ReactNode;
}

export function Step({ children }: StepProps) {
  return <>{children}</>;
}

interface StepByStepProps {
  /** Optional title — currently NOT rendered (header was removed by request). */
  title?: string;
  children: ReactNode;
}

/**
 * Progressive-reveal step container.
 *
 * Behavior:
 *   - Revealed steps render fully visible.
 *   - One "ghost" preview is rendered immediately after the last revealed
 *     step. The preview renders the full content of the next step (so the
 *     widget reserves its eventual height) but at low opacity, making it
 *     hint-readable rather than legible. The whole preview row is a
 *     clickable target — clicking it reveals the step and renders a new
 *     ghost preview for the step after.
 *   - Steps beyond `revealed + 1` are not rendered at all (the widget
 *     grows incrementally as the reader engages).
 *
 * The header (title, "n/total") and footer (BACK / NEXT / dot-tracker)
 * were removed: they were redundant once the ghost-preview affordance
 * makes "click to continue" obvious.
 */
export function StepByStep({ children }: StepByStepProps) {
  const steps: { title: string; content: ReactNode }[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;
    if (typeof p.title === "string") {
      steps.push({ title: p.title, content: p.children });
    }
  });

  const [revealed, setRevealed] = useState(1);
  const total = steps.length;

  if (total === 0) return null;

  const reveal = () => setRevealed((r) => Math.min(total, r + 1));

  // Render only revealed steps + one ghost preview for the immediate next.
  const visibleCount = Math.min(revealed + 1, total);

  // Opacity for the unrevealed ghost preview. Picked to roughly match the
  // brightness of the previous "all-future-steps-dimmed" rendering, so the
  // visual rhythm of the widget didn't flip when this design changed.
  const PREVIEW_OPACITY = 0.22;
  const PREVIEW_HOVER_OPACITY = 0.4;

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      <div className="px-4 py-3" style={{ backgroundColor: C.bgWhite }}>
        {steps.slice(0, visibleCount).map((step, i) => {
          const isRevealed = i < revealed;
          // Exactly one preview row at any given time: the immediately-next.
          const isPreview = !isRevealed;
          // The most-recently-revealed step gets a slightly more prominent
          // step-number badge so the eye lands on "where I am right now"
          // without needing the textual CURRENT label.
          const isCurrent = i === revealed - 1;

          const handleClick = isPreview ? reveal : undefined;
          const handleKey = isPreview
            ? (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  reveal();
                }
              }
            : undefined;

          return (
            <div
              key={i}
              role={isPreview ? "button" : undefined}
              tabIndex={isPreview ? 0 : undefined}
              aria-label={
                isPreview ? `Reveal step ${i + 1}: ${step.title}` : undefined
              }
              onClick={handleClick}
              onKeyDown={handleKey}
              onMouseEnter={
                isPreview
                  ? (e) => {
                      e.currentTarget.style.opacity = String(
                        PREVIEW_HOVER_OPACITY,
                      );
                    }
                  : undefined
              }
              onMouseLeave={
                isPreview
                  ? (e) => {
                      e.currentTarget.style.opacity = String(PREVIEW_OPACITY);
                    }
                  : undefined
              }
              className={[
                "flex gap-3 outline-none",
                isPreview ? "cursor-pointer select-none" : "",
              ].join(" ")}
              style={{
                opacity: isRevealed ? 1 : PREVIEW_OPACITY,
                transition: "opacity 0.25s ease",
              }}
            >
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-6 h-6 flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: isCurrent
                      ? C.headerBg
                      : isRevealed
                        ? C.borderLight
                        : C.bg,
                    color: isCurrent
                      ? C.headerText
                      : isRevealed
                        ? C.text
                        : C.borderLight,
                  }}
                >
                  {i + 1}
                </div>
                {i < total - 1 && (
                  <div
                    className="w-px flex-1 min-h-3"
                    style={{
                      backgroundColor: isRevealed ? C.borderLight : C.bg,
                    }}
                  />
                )}
              </div>

              <div className="flex-1 pb-4 last:pb-0">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: isRevealed ? C.text : C.borderLight,
                  }}
                >
                  {step.title}
                </p>
                {step.content && (
                  <div
                    className="text-[13px] leading-[1.75]"
                    // pointer-events-none so hover/click only registers on
                    // the parent row (avoids issues with links/buttons that
                    // happen to live inside the preview content).
                    style={{
                      fontFamily: "var(--font-serif)",
                      color: C.textMuted,
                      pointerEvents: isPreview ? "none" : undefined,
                    }}
                  >
                    {step.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
