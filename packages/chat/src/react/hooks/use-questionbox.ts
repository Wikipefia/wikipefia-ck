"use client";

import { useCallback } from "react";
import { useChatTransport } from "../transport-context";
import type { AskQuestionBoxArgs } from "../../types";

/**
 * Reactive subscription to a single QuestionBox's Q&A history.
 *
 * Pass `null` to get a stable "loading" result while the toolCallId is
 * still being resolved on the client (e.g. lazy-loaded message parts).
 */
export function useQuestionBoxPairs(toolCallId: string | null) {
  const transport = useChatTransport();
  return transport.useQuestionBoxPairs(toolCallId);
}

/**
 * Submit a follow-up question into a QuestionBox. The answer streams in
 * server-side and shows up via the matching `useQuestionBoxPairs`.
 */
export function useAskQuestionBox() {
  const transport = useChatTransport();
  return useCallback(
    (args: AskQuestionBoxArgs) => transport.askQuestionBox(args),
    [transport],
  );
}
