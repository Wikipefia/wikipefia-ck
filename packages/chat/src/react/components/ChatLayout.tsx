"use client";

import type { ReactNode } from "react";
import { ThreadSidebar } from "./ThreadSidebar";
import { useChatConfig } from "../transport-context";

interface ChatLayoutProps {
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  children: ReactNode;
}

/**
 * Two-pane shell: thread sidebar on the left, content area on the right.
 * Content can be a ThreadView, an empty welcome screen, or a new-thread composer.
 */
export function ChatLayout({
  activeThreadId,
  onSelectThread,
  onNewThread,
  children,
}: ChatLayoutProps) {
  const config = useChatConfig();
  return (
    <div className="flex h-full">
      <ThreadSidebar
        activeThreadId={activeThreadId}
        onSelect={onSelectThread}
        onNew={onNewThread}
        brand={config.brand}
      />
      <main className="flex-1 min-w-0 h-full">{children}</main>
    </div>
  );
}
