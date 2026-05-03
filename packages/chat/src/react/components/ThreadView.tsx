"use client";

import { useCallback } from "react";
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
  const awaitingQuiz = thread?.status === "awaiting_user";

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
              {awaitingQuiz ? (
                <motion.div
                  key="quiz-banner"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="mb-2"
                >
                  <QuizAwaitingBanner />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <MessageInput
              onSend={onSend}
              disabled={generating}
              currentModel={currentModel}
              placeholder={
                awaitingQuiz
                  ? "Answer the quiz above to continue…"
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
 * Slim banner shown above the disabled MessageInput while a Quiz is awaiting
 * the user's answers. Brutalist 2-color block + a soft pulsing dot to draw
 * the eye without flashing aggressively.
 */
function QuizAwaitingBanner() {
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
          ▲ Action required
        </div>
        <div
          className="text-[13px] leading-tight"
          style={{ color: C.text, fontFamily: "var(--font-serif)" }}
        >
          Answer the quiz above to continue the conversation. The chat input
          is disabled until you submit your answers.
        </div>
      </div>
      <style>{`@keyframes wpf-pulse { 0%, 100% { transform: scale(1); opacity: 0.75; } 50% { transform: scale(2.4); opacity: 0; } }`}</style>
    </div>
  );
}
