"use client";

import { useMemo, useState, useCallback } from "react";
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
import {
  applyDefaults,
  DEFAULT_MODE_ID,
  getMode,
  listVisibleModes,
  MODE_REGISTRY,
} from "@wikipefia/chat/modes";
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
  const [selectedModeId, setSelectedModeId] = useState<string>(DEFAULT_MODE_ID);
  const [modeSettings, setModeSettings] = useState<Record<string, unknown>>({});

  const currentModel =
    config.models.find((m) => m.id === selectedModelId) ?? defaultModel;

  // Memoize the mode list — its identity drives the picker dropdown's
  // useMemo deps; a fresh array every render would re-trigger renders down
  // through MessageInput.
  const visibleModes = useMemo(() => {
    // Include both the implicit-default (so the picker can show a "reset"
    // entry) and the user-visible modes.
    return [MODE_REGISTRY[DEFAULT_MODE_ID], ...listVisibleModes()];
  }, []);

  const handleSelectMode = useCallback(
    (modeId: string, defaults: Record<string, unknown>) => {
      setSelectedModeId(modeId);
      // When picking a mode, replace settings entirely with the mode's
      // resolved defaults. When picking "default" we get an empty object
      // back — fine, no settings to render.
      setModeSettings(defaults);
    },
    [],
  );

  const handleSettingChange = useCallback((key: string, value: unknown) => {
    setModeSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleNewThread = useCallback(
    async (text: string, attachments: AttachmentRef[]) => {
      setCreating(true);
      try {
        const mode =
          selectedModeId !== DEFAULT_MODE_ID
            ? {
                id: selectedModeId,
                // Re-apply defaults defensively so a stale partial settings
                // object can't omit a required key.
                settings: applyDefaults(getMode(selectedModeId), modeSettings),
              }
            : undefined;
        const { threadId } = await createThread(
          text,
          attachments,
          selectedModelId,
          mode,
        );
        router.replace(`/c/${threadId}`);
      } finally {
        setCreating(false);
      }
    },
    [createThread, router, selectedModelId, selectedModeId, modeSettings],
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
              modePicker={{
                modes: visibleModes,
                selectedId: selectedModeId,
                settings: modeSettings,
                onSelect: handleSelectMode,
                onSettingChange: handleSettingChange,
                locale: "ru",
              }}
            />
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
