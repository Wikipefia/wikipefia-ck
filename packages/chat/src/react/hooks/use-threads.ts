"use client";

import { useCallback } from "react";
import { useChatTransport, useDefaultModel } from "../transport-context";
import type { AttachmentRef } from "../../types";

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
    ) => {
      return await transport.createThread({
        initialMessage,
        attachments,
        modelId: modelId ?? defaultModel.id,
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
