"use client";

import {
  useCallback,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { Button, EmptyState, Textarea } from "@wikipefia/ui";
import type { TutorTopic } from "../../types";
import { useUpdateTopicPlan } from "../hooks/use-threads";

export interface TopicListPanelProps {
  threadId: string;
  topics: TutorTopic[];
  /**
   * When true, plan editing is disabled (teaching has begun). The panel
   * still shows topic statuses + descriptions; pencil / trash / drag
   * controls are hidden.
   */
  locked: boolean;
  /**
   * Optional handler for the "Replan" action — caller wires this up to
   * submitToolResponse({ action: "replan", instructions }) on the
   * pending PlanTopics approval. When undefined, the Replan button is
   * hidden.
   */
  onReplan?: (instructions: string) => Promise<void>;
}

/**
 * Right-side panel showing the tutor-mode topic plan. Two states:
 *
 *   1. Editable (review phase) — user can edit titles/descriptions/
 *      prompts inline, delete topics, add new ones, drag to reorder,
 *      and request a re-plan.
 *
 *   2. Locked (teaching/completed phase) — read-only, with status
 *      markers (pending / active / completed).
 *
 * All edits are applied immediately to the canonical
 * `threadMeta.topicPlan` via `updateTopicPlan`. The next runAgent
 * picks up the plan automatically (it's part of the system prompt
 * threadState).
 */
export function TopicListPanel({
  threadId,
  topics,
  locked,
  onReplan,
}: TopicListPanelProps) {
  const updatePlan = useUpdateTopicPlan();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [replanOpen, setReplanOpen] = useState(false);
  const [replanText, setReplanText] = useState("");
  const [replanSubmitting, setReplanSubmitting] = useState(false);
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => a.order - b.order);
  }, [topics]);

  const completedCount = useMemo(
    () => topics.filter((t) => t.status === "completed").length,
    [topics],
  );

  const persist = useCallback(
    async (next: TutorTopic[]) => {
      // Renumber order to match array index.
      const renumbered = next.map((t, i) => ({ ...t, order: i }));
      await updatePlan(threadId, renumbered);
    },
    [updatePlan, threadId],
  );

  const handlePatchTopic = useCallback(
    async (id: string, patch: Partial<TutorTopic>) => {
      const next = sortedTopics.map((t) => (t.id === id ? { ...t, ...patch } : t));
      setSavingTopicId(id);
      try {
        await persist(next);
      } finally {
        setSavingTopicId(null);
      }
    },
    [sortedTopics, persist],
  );

  const handleDeleteTopic = useCallback(
    async (id: string) => {
      const next = sortedTopics.filter((t) => t.id !== id);
      await persist(next);
    },
    [sortedTopics, persist],
  );

  const handleAddTopic = useCallback(async () => {
    const newTopic: TutorTopic = {
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: "Новая тема",
      description: "Описание темы",
      prompt: "Подробные инструкции для модели по этой теме.",
      order: sortedTopics.length,
      status: "pending",
    };
    await persist([...sortedTopics, newTopic]);
  }, [sortedTopics, persist]);

  // ── Drag-and-drop reorder ──
  const handleDragStart = useCallback(
    (id: string) => (e: ReactDragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = "move";
      // Required by Firefox to start a drag.
      e.dataTransfer.setData("text/plain", id);
      setDraggingId(id);
    },
    [],
  );

  const handleDragOver = useCallback(
    (id: string) => (e: ReactDragEvent<HTMLDivElement>) => {
      if (!draggingId || draggingId === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverId(id);
    },
    [draggingId],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => async (e: ReactDragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggingId || draggingId === targetId) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }
      const fromIdx = sortedTopics.findIndex((t) => t.id === draggingId);
      const toIdx = sortedTopics.findIndex((t) => t.id === targetId);
      if (fromIdx === -1 || toIdx === -1) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }
      const next = [...sortedTopics];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setDraggingId(null);
      setDragOverId(null);
      await persist(next);
    },
    [draggingId, sortedTopics, persist],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  const handleSubmitReplan = useCallback(async () => {
    if (!onReplan) return;
    setReplanSubmitting(true);
    try {
      await onReplan(replanText.trim());
      setReplanText("");
      setReplanOpen(false);
    } finally {
      setReplanSubmitting(false);
    }
  }, [onReplan, replanText]);

  // ── Render ──
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b" style={{ borderColor: C.borderLight }}>
        <div
          className="text-[11px] uppercase tracking-[0.15em] flex items-center justify-between"
          style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
        >
          <span>
            {topics.length} {topics.length === 1 ? "тема" : "тем"}
          </span>
          <span>
            {completedCount} / {topics.length} пройдено
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sortedTopics.length === 0 ? (
          <EmptyState
            className="px-4 py-8 text-[12px] normal-case tracking-normal"
            style={{ color: C.textMuted, fontFamily: "var(--font-serif)" }}
          >
            План пуст. {locked ? null : 'Нажмите "+ Добавить тему" ниже или "Перепланировать".'}
          </EmptyState>
        ) : null}
        <AnimatePresence initial={false}>
          {sortedTopics.map((topic, idx) => (
            <motion.div
              key={topic.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              style={{
                opacity: draggingId === topic.id ? 0.5 : 1,
              }}
            >
              {/* Drag handlers live on a plain <div> wrapper, not on
                  motion.div, because framer-motion's drag types conflict
                  with React's native DragEvent typing. */}
              <div
                draggable={!locked}
                onDragStart={!locked ? handleDragStart(topic.id) : undefined}
                onDragOver={!locked ? handleDragOver(topic.id) : undefined}
                onDragLeave={!locked ? handleDragLeave : undefined}
                onDrop={!locked ? handleDrop(topic.id) : undefined}
                onDragEnd={!locked ? handleDragEnd : undefined}
                style={{
                  borderTop:
                    dragOverId === topic.id ? `2px solid ${C.accent}` : "none",
                }}
              >
                <TopicCard
                  topic={topic}
                  index={idx}
                  locked={locked}
                  saving={savingTopicId === topic.id}
                  onPatch={(patch) => handlePatchTopic(topic.id, patch)}
                  onDelete={() => handleDeleteTopic(topic.id)}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!locked ? (
          <button
            type="button"
            onClick={handleAddTopic}
            className="w-full mt-2 px-3 py-2.5 border border-dashed cursor-pointer text-[11px] uppercase tracking-[0.1em] hover:opacity-80"
            style={{
              borderColor: C.border,
              color: C.textMuted,
              fontFamily: "var(--font-mono)",
              backgroundColor: "transparent",
            }}
          >
            + Добавить тему
          </button>
        ) : null}
      </div>

      {/* Replan section — only when editable AND we have a handler. */}
      {!locked && onReplan ? (
        <div
          className="border-t px-3 py-3"
          style={{ borderColor: C.border, backgroundColor: C.bg }}
        >
          {replanOpen ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={replanText}
                onChange={(e) => setReplanText(e.target.value)}
                placeholder="напр. сделай темы крупнее / меньше квантовой механики / добавь больше примеров"
                rows={3}
                disabled={replanSubmitting}
                className="px-2 py-1.5 text-[12px] resize-y"
                style={{
                  fontFamily: "var(--font-serif)",
                  borderColor: C.border,
                  backgroundColor: C.bgWhite,
                  color: C.text,
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[10px] uppercase tracking-[0.1em]"
                  style={{
                    color: C.textMuted,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Опционально — инструкции для перепланирования
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplanOpen(false);
                      setReplanText("");
                    }}
                    disabled={replanSubmitting}
                    style={{ color: C.textMuted }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmitReplan}
                    disabled={replanSubmitting}
                    className="border-2"
                    style={{
                      borderColor: C.accent,
                      backgroundColor: C.accent,
                      color: "#fff",
                    }}
                  >
                    {replanSubmitting ? "..." : "Перепланировать"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setReplanOpen(true)}
              className="w-full"
              style={{
                borderColor: C.border,
                color: C.text,
                backgroundColor: C.bgWhite,
              }}
            >
              ↻ Перепланировать с нуля
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Topic card ──────────────────────────────────────────────

interface TopicCardProps {
  topic: TutorTopic;
  index: number;
  locked: boolean;
  saving: boolean;
  onPatch: (patch: Partial<TutorTopic>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

function TopicCard({
  topic,
  index,
  locked,
  saving,
  onPatch,
  onDelete,
}: TopicCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState<
    "title" | "description" | "prompt" | null
  >(null);
  const [draftValue, setDraftValue] = useState("");

  const startEdit = useCallback(
    (field: "title" | "description" | "prompt") => {
      setEditingField(field);
      setDraftValue(topic[field]);
    },
    [topic],
  );

  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setDraftValue("");
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingField) return;
    const trimmed = draftValue.trim();
    if (trimmed.length === 0) {
      cancelEdit();
      return;
    }
    if (trimmed === topic[editingField]) {
      cancelEdit();
      return;
    }
    await onPatch({ [editingField]: trimmed });
    setEditingField(null);
    setDraftValue("");
  }, [editingField, draftValue, topic, onPatch, cancelEdit]);

  const onEditKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      } else if (
        e.key === "Enter" &&
        (e.metaKey || e.ctrlKey || (editingField === "title" && !e.shiftKey))
      ) {
        e.preventDefault();
        void commitEdit();
      }
    },
    [editingField, cancelEdit, commitEdit],
  );

  const statusMarker = (() => {
    switch (topic.status) {
      case "completed":
        return { char: "✓", color: "#059669" };
      case "active":
        return { char: "▶", color: C.accent };
      case "skipped":
        return { char: "✗", color: "#9CA3AF" };
      case "pending":
      default:
        return { char: "○", color: C.textMuted };
    }
  })();

  return (
    <div
      className="border mb-1.5 px-3 py-2"
      style={{
        borderColor: topic.status === "active" ? C.accent : C.borderLight,
        backgroundColor: C.bgWhite,
      }}
    >
      <div className="flex items-start gap-2">
        {!locked ? (
          <span
            className="cursor-grab select-none mt-0.5 text-[14px]"
            style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
            title="Перетащите для перестановки"
            aria-label="Drag handle"
          >
            ⋮⋮
          </span>
        ) : null}
        <span
          className="text-[10px] mt-0.5 font-bold"
          style={{
            color: statusMarker.color,
            fontFamily: "var(--font-mono)",
            minWidth: "16px",
          }}
          aria-label={`Status: ${topic.status}`}
        >
          {statusMarker.char}
        </span>
        <span
          className="text-[10px] mt-0.5 uppercase tracking-[0.1em]"
          style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="flex-1 min-w-0">
          {editingField === "title" ? (
            <input
              autoFocus
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onEditKeyDown}
              className="w-full text-[13px] font-bold border px-1.5 py-0.5 outline-none"
              style={{
                fontFamily: "var(--font-serif)",
                borderColor: C.accent,
                backgroundColor: C.bgWhite,
                color: C.text,
              }}
            />
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && startEdit("title")}
              className="text-left text-[13px] font-bold w-full disabled:cursor-default"
              style={{
                fontFamily: "var(--font-serif)",
                color: C.text,
              }}
            >
              {topic.title}
            </button>
          )}
          {editingField === "description" ? (
            <input
              autoFocus
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onEditKeyDown}
              className="w-full text-[11px] border px-1.5 py-0.5 outline-none mt-1"
              style={{
                fontFamily: "var(--font-serif)",
                borderColor: C.accent,
                backgroundColor: C.bgWhite,
                color: C.text,
              }}
            />
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && startEdit("description")}
              className="text-left text-[11px] mt-0.5 leading-snug w-full disabled:cursor-default"
              style={{
                fontFamily: "var(--font-serif)",
                color: C.textMuted,
              }}
            >
              {topic.description}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {saving ? (
            <span
              className="text-[10px] uppercase"
              style={{
                color: C.textMuted,
                fontFamily: "var(--font-mono)",
              }}
            >
              ...
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] cursor-pointer hover:opacity-80"
            style={{
              color: C.textMuted,
              fontFamily: "var(--font-mono)",
            }}
            title={expanded ? "Скрыть промт" : "Показать промт"}
            aria-label={expanded ? "Collapse prompt" : "Expand prompt"}
          >
            {expanded ? "▴" : "▾"}
          </button>
          {!locked ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-[12px] cursor-pointer hover:opacity-80 px-1"
              style={{ color: C.textMuted }}
              title="Удалить тему"
              aria-label="Delete topic"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-2 pl-6 overflow-hidden"
          >
            <div
              className="text-[10px] uppercase tracking-[0.1em] mb-1"
              style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
            >
              Prompt
            </div>
            {editingField === "prompt" ? (
              <textarea
                autoFocus
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={onEditKeyDown}
                rows={Math.min(8, Math.max(3, draftValue.split("\n").length))}
                className="w-full text-[11px] border px-1.5 py-1 outline-none resize-y"
                style={{
                  fontFamily: "var(--font-serif)",
                  borderColor: C.accent,
                  backgroundColor: C.bgWhite,
                  color: C.text,
                }}
              />
            ) : (
              <button
                type="button"
                disabled={locked}
                onClick={() => !locked && startEdit("prompt")}
                className="text-left text-[11px] leading-relaxed w-full whitespace-pre-wrap disabled:cursor-default"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: C.text,
                }}
              >
                {topic.prompt}
              </button>
            )}
            {!locked && editingField !== "prompt" ? (
              <span
                className="text-[10px] uppercase tracking-[0.1em] mt-1 block"
                style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
              >
                нажмите для редактирования
              </span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
