"use client";

import { useCallback } from "react";
import { useChatTransport, useDefaultModel } from "../transport-context";
import type { AttachmentRef, TutorTopic } from "../../types";

/** Reactive list of the user's threads. */
export function useThreads() {
  const transport = useChatTransport();
  return transport.useThreads();
}

/** Reactive single-thread accessor. */
export function useThread(threadId: string | null) {
  const transport = useChatTransport();
  return transport.useThread(threadId);
}

/** Create a new thread with an initial message. */
export function useCreateThread() {
  const transport = useChatTransport();
  const defaultModel = useDefaultModel();
  return useCallback(
    async (
      initialMessage: string,
      attachments: AttachmentRef[] = [],
      modelId?: string,
      mode?: { id: string; settings: Record<string, unknown> },
    ) => {
      return await transport.createThread({
        initialMessage,
        attachments,
        modelId: modelId ?? defaultModel.id,
        ...(mode && mode.id !== "default"
          ? { mode: mode.id, modeSettings: mode.settings }
          : {}),
      });
    },
    [transport, defaultModel],
  );
}

export function useDeleteThread() {
  const transport = useChatTransport();
  return useCallback(
    (threadId: string) => transport.deleteThread(threadId),
    [transport],
  );
}

export function useRenameThread() {
  const transport = useChatTransport();
  return useCallback(
    (threadId: string, title: string) => transport.renameThread(threadId, title),
    [transport],
  );
}

/** Change the model for an existing thread. Affects subsequent generations. */
export function useSetThreadModel() {
  const transport = useChatTransport();
  return useCallback(
    (threadId: string, modelId: string) =>
      transport.setThreadModel(threadId, modelId),
    [transport],
  );
}

/**
 * Replace the entire topic plan of a tutor thread. Used by the side
 * panel for inline edits, deletions, additions, and drag-reorder. The
 * mutation throws on the server if `tutorPhase` is "teaching" or
 * "completed" (plan is locked); callers should disable editing UI in
 * that state.
 */
export function useUpdateTopicPlan() {
  const transport = useChatTransport();
  return useCallback(
    (threadId: string, topics: TutorTopic[]) =>
      transport.updateTopicPlan(threadId, topics),
    [transport],
  );
}
