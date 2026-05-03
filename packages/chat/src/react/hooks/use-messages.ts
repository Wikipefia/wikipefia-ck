"use client";

import { useCallback } from "react";
import { useChatTransport } from "../transport-context";
import type { AttachmentRef } from "../../types";

/** Reactive subscription to messages of a thread (with streaming deltas). */
export function useMessages(threadId: string | null) {
  const transport = useChatTransport();
  return transport.useMessages(threadId);
}

export function useSendMessage(threadId: string | null) {
  const transport = useChatTransport();
  return useCallback(
    (content: string, attachments: AttachmentRef[] = []) => {
      if (!threadId) throw new Error("No active thread");
      return transport.sendMessage(threadId, content, attachments);
    },
    [transport, threadId],
  );
}

export function useEditAndRegenerate() {
  const transport = useChatTransport();
  return useCallback(
    (messageId: string, newContent: string) =>
      transport.editAndRegenerate(messageId, newContent),
    [transport],
  );
}

export function useCancelGeneration(threadId: string | null) {
  const transport = useChatTransport();
  return useCallback(() => {
    if (!threadId) return Promise.resolve();
    return transport.cancelGeneration(threadId);
  }, [transport, threadId]);
}

export function useSubmitToolResponse() {
  const transport = useChatTransport();
  return useCallback(
    (messageId: string, toolCallId: string, response: unknown) =>
      transport.submitToolResponse(messageId, toolCallId, response),
    [transport],
  );
}
