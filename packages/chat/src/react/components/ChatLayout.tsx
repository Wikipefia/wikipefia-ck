"use client";

import { useState, type ReactNode } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import { ThreadSidebar } from "./ThreadSidebar";
import { useChatConfig } from "../transport-context";

interface ChatLayoutProps {
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  children: ReactNode;
  /**
   * Optional content for the right side panel. When provided, a third
   * pane appears alongside the chat (collapsible via the toggle button
   * in the panel header). Used currently for the tutor-mode topic list;
   * future panel content types can plug in here.
   */
  rightPanel?: {
    title: string;
    /** Subtitle shown under the title (small mono caps). */
    subtitle?: string;
    content: ReactNode;
    /** When true, panel is open by default. Defaults to true. */
    defaultOpen?: boolean;
  };
}

/**
 * Three-pane shell: thread sidebar (left) + chat content (center) +
 * optional right panel. Right panel is intentionally optional — when
 * `rightPanel` is undefined the layout collapses to two panes (the
 * existing behavior).
 *
 * The right panel is collapsible: a header toggle hides the body but
 * keeps a thin rail visible so the user can re-open it. We track open
 * state locally — re-opening behavior persists per-mount, not per-thread,
 * which is what we want for an ephemeral side panel.
 */
export function ChatLayout({
  activeThreadId,
  onSelectThread,
  onNewThread,
  children,
  rightPanel,
}: ChatLayoutProps) {
  const config = useChatConfig();
  const [panelOpen, setPanelOpen] = useState(rightPanel?.defaultOpen ?? true);

  return (
    <div className="flex h-full">
      <ThreadSidebar
        activeThreadId={activeThreadId}
        onSelect={onSelectThread}
        onNew={onNewThread}
        brand={config.brand}
      />
      <main className="flex-1 min-w-0 h-full">{children}</main>
      {rightPanel ? (
        <aside
          className="h-full border-l flex flex-col"
          style={{
            borderColor: C.border,
            backgroundColor: C.bgWhite,
            width: panelOpen ? "380px" : "44px",
            transition: "width 0.2s",
          }}
        >
          <div
            className="border-b flex items-center justify-between gap-2 px-3 py-2.5"
            style={{ borderColor: C.border, minHeight: "44px" }}
          >
            {panelOpen ? (
              <div className="flex flex-col min-w-0 flex-1">
                <div
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{
                    color: C.textMuted,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {rightPanel.subtitle ?? "Side panel"}
                </div>
                <div
                  className="text-[14px] truncate"
                  style={{ color: C.text, fontFamily: "var(--font-serif)" }}
                >
                  {rightPanel.title}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-label={panelOpen ? "Collapse panel" : "Expand panel"}
              title={panelOpen ? "Collapse panel" : "Expand panel"}
              className="border h-[28px] w-[28px] flex items-center justify-center text-[12px] cursor-pointer hover:opacity-80"
              style={{
                borderColor: C.border,
                backgroundColor: C.bg,
                color: C.text,
                fontFamily: "var(--font-mono)",
              }}
            >
              {panelOpen ? "›" : "‹"}
            </button>
          </div>
          {panelOpen ? (
            <div className="flex-1 overflow-y-auto">{rightPanel.content}</div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
