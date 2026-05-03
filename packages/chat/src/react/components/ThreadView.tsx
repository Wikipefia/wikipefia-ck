"use client";

import { useCallback } from "react";
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
            <MessageInput
              onSend={onSend}
              disabled={generating}
              currentModel={currentModel}
              placeholder={
                thread?.status === "awaiting_user"
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
