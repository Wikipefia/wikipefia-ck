"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { useThreads, useDeleteThread } from "../hooks/use-threads";
import type { Thread } from "../../types";
import { Button } from "./primitives/Button";
import { IconButton } from "./primitives/IconButton";

interface ThreadSidebarProps {
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onNew: () => void;
  brand?: { productName: string; tagline?: string };
}

interface ThreadSection {
  label: string;
  threads: Thread[];
}

function groupThreadsByDate(threads: Thread[]): ThreadSection[] {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = startOfToday.getTime() - 24 * 60 * 60 * 1000;
  const start7DaysAgo = startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000;
  const start30DaysAgo = startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000;

  const today: Thread[] = [];
  const yesterday: Thread[] = [];
  const last7: Thread[] = [];
  const last30: Thread[] = [];
  const older: Thread[] = [];

  for (const t of threads) {
    const ts = t.updatedAt;
    if (ts >= startOfToday.getTime()) today.push(t);
    else if (ts >= startOfYesterday) yesterday.push(t);
    else if (ts >= start7DaysAgo) last7.push(t);
    else if (ts >= start30DaysAgo) last30.push(t);
    else older.push(t);
  }

  return [
    { label: "Today", threads: today },
    { label: "Yesterday", threads: yesterday },
    { label: "Last 7 days", threads: last7 },
    { label: "Last 30 days", threads: last30 },
    { label: "Older", threads: older },
  ].filter((s) => s.threads.length > 0);
}

export function ThreadSidebar({
  activeThreadId,
  onSelect,
  onNew,
  brand,
}: ThreadSidebarProps) {
  const { threads, status } = useThreads();
  const deleteThread = useDeleteThread();
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const sections = useMemo(() => groupThreadsByDate(threads), [threads]);

  const handleDelete = async (id: string) => {
    if (confirmingDelete !== id) {
      setConfirmingDelete(id);
      setTimeout(() => {
        setConfirmingDelete((cur) => (cur === id ? null : cur));
      }, 3000);
      return;
    }
    await deleteThread(id);
    setConfirmingDelete(null);
  };

  return (
    <aside
      className="flex flex-col h-full border-r"
      style={{
        borderColor: C.border,
        backgroundColor: C.bg,
        width: 280,
        minWidth: 280,
      }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <div
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          {brand?.productName ?? "Wikipefia Chat"}
        </div>
        {brand?.tagline ? (
          <div
            className="text-[9px] uppercase tracking-[0.15em] mt-0.5"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.headerText,
              opacity: 0.6,
            }}
          >
            {brand.tagline}
          </div>
        ) : null}
      </div>

      <div className="px-3 py-3">
        <Button onClick={onNew} variant="primary" className="w-full">
          + New thread
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {status === "loading" ? (
          <div
            className="text-[10px] uppercase tracking-wider px-2 py-2"
            style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
          >
            Loading…
          </div>
        ) : threads.length === 0 ? (
          <div
            className="text-[11px] px-2 py-2"
            style={{
              color: C.textMuted,
              fontFamily: "var(--font-serif)",
            }}
          >
            No threads yet.
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.label} className="mb-3">
              <div
                className="px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: C.accent,
                }}
              >
                {section.label}
              </div>
              {section.threads.map((t, i) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  index={i}
                  active={t.id === activeThreadId}
                  confirming={confirmingDelete === t.id}
                  onSelect={() => onSelect(t.id)}
                  onDelete={() => handleDelete(t.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

interface ThreadRowProps {
  thread: Thread;
  index: number;
  active: boolean;
  confirming: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ThreadRow({
  thread,
  index,
  active,
  confirming,
  onSelect,
  onDelete,
}: ThreadRowProps) {
  const generating =
    thread.status === "generating" || thread.status === "awaiting_user";
  const errored = thread.status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, x: -3 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.15) }}
      // bg + border-left live on the wrapper so the row stays visually
      // consistent when the cursor moves from the title button onto the
      // hover overlay (sibling element below).
      className={[
        "group relative transition-colors",
        active
          ? "bg-[var(--c-bg-white)]"
          : "hover:bg-[var(--c-bg-white)]",
      ].join(" ")}
      style={{
        borderLeft: active
          ? `2px solid ${C.accent}`
          : "2px solid transparent",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        title={thread.title || "Untitled"}
        // No padding-right reservation: title gets the full width with a
        // natural truncate. On hover, the overlay below floats over the
        // right portion with a gradient mask that smoothly hides the text.
        className="w-full text-left pl-2.5 pr-2.5 py-2 cursor-pointer block"
      >
        <span
          className="block text-[13px] truncate"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: active ? 600 : 400,
            color: errored ? C.textMuted : C.text,
          }}
        >
          {thread.title || "Untitled"}
        </span>
      </button>

      {/* Status dot — only for generating / awaiting-user state. Errored
          threads are signalled by the dimmed title color (errored ? textMuted)
          which is enough; an extra red dot is just noise.
          Fades out on row hover so the action overlay can take over the
          right edge cleanly. */}
      {generating ? (
        <span
          aria-label={
            thread.status === "awaiting_user" ? "awaiting answer" : "generating"
          }
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-150 group-hover:opacity-0 animate-pulse"
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            backgroundColor: C.accent,
          }}
        />
      ) : null}

      {/* Hover overlay: gradient mask + ✕ button.
          Layout: pl-5 (20px gradient zone) + button (28px) + pr-1.5 (6px)
                = 54px total overlay.
          Gradient uses PIXEL stops so the button always sits on fully solid
          bgWhite regardless of how Tailwind resolves the percentages —
          16px of fade then a hard solid zone covering the whole button. */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pl-5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{
          background: `linear-gradient(to right, transparent 0px, ${C.bgWhite} 20px)`,
        }}
      >
        <button
          type="button"
          aria-label={confirming ? "Confirm delete" : "Delete thread"}
          title={confirming ? "Confirm delete" : "Delete thread"}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="pointer-events-auto flex w-7 h-7 items-center justify-center text-[14px] leading-none transition-colors"
          style={{
            color: confirming ? "#DC2626" : C.textMuted,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = confirming
              ? "#DC2626"
              : "#DC2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = confirming
              ? "#DC2626"
              : C.textMuted;
          }}
        >
          {confirming ? "✓" : "✕"}
        </button>
      </div>
    </motion.div>
  );
}
