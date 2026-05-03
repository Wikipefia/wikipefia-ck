"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChatLayout,
  MessageInput,
  ModelPicker,
  useCreateThread,
  useSessionId,
  useChatConfig,
  useDefaultModel,
} from "@wikipefia/chat/react";
import type { AttachmentRef } from "@wikipefia/chat/types";
import { C } from "@wikipefia/mdx-renderer/theme";

/**
 * Home page = "new thread" composer. Always shows the welcome screen with
 * the input box and a model picker. Past threads live in the sidebar;
 * clicking one navigates to /c/[threadId]. We never auto-redirect here.
 */
export default function HomePage() {
  const router = useRouter();
  const sessionId = useSessionId();
  const config = useChatConfig();
  const defaultModel = useDefaultModel();
  const createThread = useCreateThread();
  const [creating, setCreating] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModel.id);

  const currentModel =
    config.models.find((m) => m.id === selectedModelId) ?? defaultModel;

  const handleNewThread = useCallback(
    async (text: string, attachments: AttachmentRef[]) => {
      setCreating(true);
      try {
        const { threadId } = await createThread(text, attachments, selectedModelId);
        router.replace(`/c/${threadId}`);
      } finally {
        setCreating(false);
      }
    },
    [createThread, router, selectedModelId],
  );

  if (!sessionId) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
      >
        <span className="text-[10px] uppercase tracking-[0.15em]">Loading…</span>
      </div>
    );
  }

  return (
    <ChatLayout
      activeThreadId={null}
      onSelectThread={(id) => router.push(`/c/${id}`)}
      onNewThread={() => {}}
    >
      <div className="h-full flex flex-col" style={{ backgroundColor: C.bg }}>
        <header
          className="px-4 md:px-8 py-3 border-b flex items-center justify-end"
          style={{ borderColor: C.border, backgroundColor: C.bgWhite }}
        >
          <ModelPicker
            models={config.models}
            currentId={selectedModelId}
            onSelect={setSelectedModelId}
          />
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl text-center">
            <div
              className="text-[10px] uppercase tracking-[0.2em] mb-3"
              style={{ color: C.accent, fontFamily: "var(--font-mono)" }}
            >
              ▣ WIKIPEFIA CHAT
            </div>
            <h1
              className="text-3xl md:text-5xl font-bold uppercase tracking-tighter leading-none mb-4"
              style={{ color: C.text }}
            >
              Ask anything.
              <br />
              Learn deeper.
            </h1>
            <p
              className="text-[15px] mt-4"
              style={{ color: C.textMuted, fontFamily: "var(--font-serif)" }}
            >
              An AI tutor that answers with rich interactive widgets — quizzes,
              charts, diagrams, and more. Drop a PDF, ask a question, and get
              feedback that actually teaches.
            </p>
          </div>
        </div>
        <div
          className="px-4 md:px-8 py-4 border-t"
          style={{ borderColor: C.border, backgroundColor: C.bg }}
        >
          <div className="max-w-3xl mx-auto">
            <MessageInput
              onSend={handleNewThread}
              disabled={creating}
              currentModel={currentModel}
            />
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
