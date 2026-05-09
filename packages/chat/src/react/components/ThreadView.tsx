"use client";

import { useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "@wikipefia/mdx-renderer/theme";
import { useThread, useSetThreadModel } from "../hooks/use-threads";
import {
  useMessages,
  useSendMessage,
  useCancelGeneration,
} from "../hooks/use-messages";
import { useChatConfig } from "../transport-context";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Button } from "./primitives/Button";
import { ModelPicker } from "./ModelPicker";
import { DebugExportMenu } from "./DebugExportMenu";
import { getMode, type Localized } from "@wikipefia/chat/modes";

interface ThreadViewProps {
  threadId: string;
}

export function ThreadView({ threadId }: ThreadViewProps) {
  const thread = useThread(threadId);
  const { messages, status } = useMessages(threadId);
  const send = useSendMessage(threadId);
  const cancel = useCancelGeneration(threadId);
  const setThreadModel = useSetThreadModel();
  const config = useChatConfig();

  const currentModel =
    config.models.find((m) => m.id === thread?.modelId) ?? config.models[0];

  const onSend = useCallback(
    async (text: string, attachments: { storageId: string; name: string; mimeType: string; size: number }[]) => {
      await send(text, attachments);
    },
    [send],
  );

  const onSelectModel = useCallback(
    (modelId: string) => {
      void setThreadModel(threadId, modelId);
    },
    [setThreadModel, threadId],
  );

  const generating =
    thread?.status === "generating" || thread?.status === "awaiting_user";
  const awaitingUser = thread?.status === "awaiting_user";

  // Resolve the thread's mode (if any) for the read-only badge in the
  // header. Locked at thread creation; we only display, never edit.
  const threadMode = useMemo(() => {
    if (!thread?.mode || thread.mode === "default") return null;
    return getMode(thread.mode);
  }, [thread?.mode]);
  const localizedRu = (s: Localized | undefined): string =>
    s ? (s.ru ?? s.en ?? "") : "";

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: C.bg }}>
      <header
        className="px-4 md:px-8 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: C.border, backgroundColor: C.bgWhite }}
      >
        <div className="flex flex-col min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
          >
            Thread
          </div>
          <div
            className="text-[14px] truncate"
            style={{ color: C.text, fontFamily: "var(--font-serif)" }}
          >
            {thread?.title || "Untitled"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {threadMode ? (
            <ThreadModeBadge
              mode={threadMode}
              settings={thread?.modeSettings}
              localizedRu={localizedRu}
            />
          ) : null}
          {currentModel ? (
            <ModelPicker
              models={config.models}
              currentId={currentModel.id}
              onSelect={onSelectModel}
              disabled={generating}
            />
          ) : null}
          {generating ? (
            <Button onClick={cancel} variant="danger" size="sm">
              ⏹ Cancel
            </Button>
          ) : null}
          <DebugExportMenu threadId={threadId} />
        </div>
      </header>

      {/* Scrollable message area + floating input overlay */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col">
          <MessageList messages={messages} loading={status === "loading"} />
        </div>

        {/* Bottom fade so messages don't visually crash into the input.
            Pointer-events-none so they pass clicks through to messages. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{
            background: `linear-gradient(to top, ${C.bg} 30%, transparent 100%)`,
          }}
        />

        {/* Floating input — sits over the messages */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-4">
          <div className="pointer-events-auto max-w-3xl mx-auto">
            <AnimatePresence>
              {awaitingUser ? (
                <motion.div
                  key="awaiting-user-banner"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="mb-2"
                >
                  <AwaitingUserBanner />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <MessageInput
              onSend={onSend}
              disabled={generating}
              currentModel={currentModel}
              placeholder={
                awaitingUser
                  ? "Ответьте на вопрос выше, чтобы продолжить…"
                  : "Ask anything…"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Slim banner shown above the disabled MessageInput while the agent is
 * awaiting a user response (Quiz answers, AskUserQuestion, NextTopicButton).
 * Brutalist 2-color block + a soft pulsing dot to draw the eye without
 * flashing aggressively.
 */
function AwaitingUserBanner() {
  return (
    <div
      className="border-2 px-3 py-2 flex items-center gap-3"
      style={{
        borderColor: C.accent,
        backgroundColor: C.bgWhite,
        // Subtle inner glow so it stands out against the page bg.
        boxShadow: `0 0 0 4px ${C.accent}10`,
      }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{
            backgroundColor: C.accent,
            animation: "wpf-pulse 1.6s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ backgroundColor: C.accent }}
        />
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: C.accent, fontFamily: "var(--font-mono)" }}
        >
          ▲ Нужен ваш ответ
        </div>
        <div
          className="text-[13px] leading-tight"
          style={{ color: C.text, fontFamily: "var(--font-serif)" }}
        >
          Ответьте на вопрос или используйте кнопку выше, чтобы продолжить.
          Поле ввода заблокировано до вашего ответа.
        </div>
      </div>
      <style>{`@keyframes wpf-pulse { 0%, 100% { transform: scale(1); opacity: 0.75; } 50% { transform: scale(2.4); opacity: 0; } }`}</style>
    </div>
  );
}

/**
 * Read-only badge in the header showing the thread's mode. Mode is locked
 * at thread creation, so this is purely informational. Hover/click to see
 * the resolved settings.
 */
function ThreadModeBadge({
  mode,
  settings,
  localizedRu,
}: {
  mode: ReturnType<typeof getMode>;
  settings: Record<string, unknown> | undefined;
  localizedRu: (s: Localized | undefined) => string;
}) {
  // Build a one-line summary of the mode's settings to show in the title
  // attribute (browser tooltip).
  const summary = mode.settings
    .map((s) => {
      const v = settings?.[s.key] ?? s.defaultValue;
      let display: string;
      if (s.type === "enum") {
        const opt = s.options.find((o) => o.value === v);
        display = opt ? localizedRu(opt.label) : String(v);
      } else if (s.type === "boolean") {
        display = v ? "вкл" : "выкл";
      } else {
        const t = String(v ?? "").trim();
        display = t.length === 0 ? "—" : t;
      }
      return `${localizedRu(s.label)}: ${display}`;
    })
    .join(" · ");
  return (
    <span
      title={summary || undefined}
      className="border h-[28px] px-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{
        fontFamily: "var(--font-mono)",
        borderColor: C.accent,
        backgroundColor: C.bgWhite,
        color: C.accent,
      }}
    >
      <span>{mode.icon}</span>
      <span>{localizedRu(mode.label)}</span>
    </span>
  );
}
