"use client";

import { useMemo, useRef } from "react";
import { useMutation, useAction, useQuery, useConvex } from "convex/react";
import {
  useUIMessages,
  optimisticallySendMessage,
} from "@convex-dev/agent/react";
import type {
  ChatMessage,
  ChatTransport,
  Thread,
  AttachmentRef,
  ExportFormat,
  ListMessagesResult,
  ListThreadsResult,
  ListQuestionBoxPairsResult,
  MessagePart,
  MessageStatus,
  ThreadStatus,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConvexApi = any;

export interface UseConvexChatTransportArgs {
  api: ConvexApi;
  /**
   * Anonymous session id (stable across reloads via localStorage).
   * Pass `null` until the session id resolves on mount; the transport
   * will return loading states while userId is null.
   */
  userId: string | null;
}

/**
 * React hook that builds a `ChatTransport` backed by Convex + @convex-dev/agent.
 *
 * Identity is provided via the `userId` arg (an anonymous session id from
 * localStorage). Every mutation/query includes it for thread scoping.
 *
 * Usage:
 *   const userId = useSessionId();
 *   const transport = useConvexChatTransport({ api, userId });
 *   <ChatTransportProvider transport={transport} config={...}>
 */
export function useConvexChatTransport({
  api,
  userId,
}: UseConvexChatTransportArgs): ChatTransport {
  // Convex client (kept for parity / cache access if needed)
  useConvex();

  const mCreateThread = useMutation(api.chat.threads.createThread);
  const mDeleteThread = useMutation(api.chat.threads.deleteThread);
  const mRenameThread = useMutation(api.chat.threads.renameThread);
  const mSetModel = useMutation(api.chat.threads.setModel);
  const mCancelGeneration = useMutation(api.chat.threads.cancelGeneration);

  const mSendMessage = useMutation(api.chat.messages.sendMessage);
  const mEditAndRegenerate = useMutation(api.chat.messages.editAndRegenerate);
  const mRegenerateMessage = useMutation(api.chat.messages.regenerateMessage);
  const mSubmitToolResponse = useMutation(api.chat.messages.submitToolResponse);

  const mAskQuestionBox = useMutation(api.chat.questionBox.askQuestionBox);

  const mGenerateUploadUrl = useMutation(api.chat.files.generateUploadUrl);

  const aExportThread = useAction(api.chat.export.exportThread);

  return useMemo<ChatTransport>(
    () => ({
      // ── Threads (reactive subscriptions are hooks) ─────────
      useThreads(): ListThreadsResult {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const data = useQuery(
          api.chat.threads.listMyThreads,
          userId ? { userId } : "skip",
        );
        // Memoize the converted array so consumers' useEffect/useMemo
        // dependencies remain stable across re-renders. Without this,
        // every render produces a fresh array → cascading re-renders
        // through every component that depends on `threads`.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useMemo<ListThreadsResult>(() => {
          if (!userId) return { threads: [], status: "loading" };
          if (data === undefined) return { threads: [], status: "loading" };
          return {
            threads: data.map((t: ConvexThreadDoc) => convertThread(t)),
            status: "ready",
          };
        }, [data, userId]);
      },

      useThread(threadId: string | null): Thread | null {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const data = useQuery(
          api.chat.threads.getThread,
          threadId && userId ? { threadId, userId } : "skip",
        );
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useMemo<Thread | null>(
          () => (data ? convertThread(data) : null),
          [data],
        );
      },

      async createThread({ initialMessage, attachments, modelId }) {
        if (!userId) throw new Error("Session not ready");
        return await mCreateThread({
          userId,
          initialMessage,
          attachments,
          modelId,
        });
      },

      async deleteThread(threadId) {
        if (!userId) throw new Error("Session not ready");
        await mDeleteThread({ userId, threadId });
      },

      async renameThread(threadId, title) {
        if (!userId) throw new Error("Session not ready");
        await mRenameThread({ userId, threadId, title });
      },

      // ── Messages ──────────────────────────────────────────
      useMessages(threadId: string | null): ListMessagesResult {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { results, status, loadMore } = useUIMessages(
          api.chat.messages.listMessages,
          threadId && userId ? { threadId, userId } : "skip",
          { initialNumItems: 50, stream: true },
        );
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useMemo<ListMessagesResult>(() => {
          const uiStatus: ListMessagesResult["status"] =
            !userId || status === "LoadingFirstPage" ? "loading" : "ready";
          // The agent's UIMessage type does NOT carry `threadId` — that
          // attribute lives on the *query* level, not the message level.
          // Inject the threadId we know from the caller so downstream
          // widgets (e.g. QuestionBox) that need the thread anchor can
          // read it off `message.threadId`.
          return {
            messages: (results ?? []).map((m) =>
              convertUIMessage(m, threadId ?? ""),
            ),
            status: uiStatus,
            loadMore:
              status === "CanLoadMore" ? () => loadMore(20) : undefined,
          };
        }, [results, status, loadMore, userId, threadId]);
      },

      async sendMessage(threadId, content, attachments) {
        if (!userId) throw new Error("Session not ready");
        await mSendMessage({
          userId,
          threadId,
          prompt: content,
          attachments: attachments as AttachmentRef[],
        });
      },

      async setThreadModel(threadId, modelId) {
        if (!userId) throw new Error("Session not ready");
        await mSetModel({ userId, threadId, modelId });
      },

      async editAndRegenerate(messageId, newContent, options) {
        if (!userId) throw new Error("Session not ready");
        await mEditAndRegenerate({
          userId,
          messageId,
          newContent,
          attachments: options?.attachments ?? [],
          ...(options?.modelId ? { modelId: options.modelId } : {}),
        });
      },

      async regenerateMessage(messageId, options) {
        if (!userId) throw new Error("Session not ready");
        await mRegenerateMessage({
          userId,
          messageId,
          ...(options?.modelId ? { modelId: options.modelId } : {}),
        });
      },

      async cancelGeneration(threadId) {
        if (!userId) throw new Error("Session not ready");
        await mCancelGeneration({ userId, threadId });
      },

      async submitToolResponse(messageId, toolCallId, response, approvalId) {
        if (!userId) throw new Error("Session not ready");
        await mSubmitToolResponse({
          userId,
          messageId,
          toolCallId,
          response,
          ...(approvalId ? { approvalId } : {}),
        });
      },

      // ── QuestionBox ───────────────────────────────────────
      useQuestionBoxPairs(toolCallId): ListQuestionBoxPairsResult {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const data = useQuery(
          api.chat.questionBox.listPairs,
          toolCallId && userId ? { userId, toolCallId } : "skip",
        );
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useMemo<ListQuestionBoxPairsResult>(() => {
          if (!toolCallId || !userId) {
            return { pairs: [], status: "loading" };
          }
          if (data === undefined) return { pairs: [], status: "loading" };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows = data as any[];
          return {
            pairs: rows.map((r) => ({
              id: r._id,
              ord: r.ord,
              question: r.question,
              answer: r.answer,
              status: r.status,
              errorMessage: r.errorMessage,
              createdAt: r.createdAt,
            })),
            status: "ready",
          };
        }, [data, toolCallId]);
      },

      async askQuestionBox(args) {
        if (!userId) throw new Error("Session not ready");
        await mAskQuestionBox({
          userId,
          parentThreadId: args.parentThreadId,
          parentMessageId: args.parentMessageId,
          toolCallId: args.toolCallId,
          topic: args.topic,
          question: args.question,
        });
      },

      // ── Files ─────────────────────────────────────────────
      async uploadFile(file: File): Promise<AttachmentRef> {
        if (!userId) throw new Error("Session not ready");
        const url = await mGenerateUploadUrl({ userId });
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const { storageId } = (await res.json()) as { storageId: string };
        return {
          storageId,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        };
      },

      // ── Debug ─────────────────────────────────────────────
      async exportThread(threadId, format: ExportFormat) {
        if (!userId) throw new Error("Session not ready");
        const { content, mime } = await aExportThread({
          userId,
          threadId,
          format,
        });
        return new Blob([content], { type: mime });
      },
    }),
    [
      api,
      userId,
      mCreateThread,
      mDeleteThread,
      mRenameThread,
      mSetModel,
      mCancelGeneration,
      mSendMessage,
      mEditAndRegenerate,
      mRegenerateMessage,
      mSubmitToolResponse,
      mAskQuestionBox,
      mGenerateUploadUrl,
      aExportThread,
    ],
  );
}

export { optimisticallySendMessage };

// ────────────────────────────────────────────────────────
// Conversion helpers (unchanged)
// ────────────────────────────────────────────────────────

interface ConvexThreadDoc {
  _id: string;
  threadId: string;
  title?: string;
  status?: string;
  modelId?: string;
  systemPromptVersion?: string;
  createdAt: number;
  updatedAt: number;
}

function convertThread(t: ConvexThreadDoc): Thread {
  return {
    id: t.threadId,
    title: t.title ?? "Untitled",
    status: (t.status as ThreadStatus) ?? "idle",
    modelId: t.modelId ?? "",
    systemPromptVersion: t.systemPromptVersion ?? "v1",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/**
 * Convert one agent-component UI message into our app's `ChatMessage` shape.
 *
 * `threadIdFallback` is required because the agent's UIMessage type does
 * NOT carry the threadId — it's an attribute of the query, not the row.
 * Callers MUST pass the threadId that matched the query they ran.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertUIMessage(m: any, threadIdFallback: string): ChatMessage {
  const parts: MessagePart[] = [];
  if (Array.isArray(m.parts)) {
    for (const p of m.parts) {
      if (!p?.type) continue;
      const t = p.type as string;
      if (t === "text") {
        parts.push({ type: "text", text: p.text ?? "" });
      } else if (t === "reasoning") {
        parts.push({ type: "reasoning", text: p.text ?? "" });
      } else if (t.startsWith("tool-") && t !== "tool-result") {
        const toolName = p.toolName ?? t.slice(5);
        const state =
          p.state === "input-streaming"
            ? ("partial" as const)
            : ("complete" as const);
        const args = p.input ?? p.args ?? {};
        const callId = p.toolCallId ?? p.id ?? `${m._id}-${parts.length}`;
        // AI SDK's UIMessages helper attaches `.approval = { id }` once the
        // tool-call has paused for approval. The id is the distinct
        // approvalId we need to round-trip when the user submits the
        // response — DON'T confuse it with toolCallId.
        const approvalId =
          (typeof p.approval?.id === "string" ? p.approval.id : undefined) ??
          (typeof p.approvalId === "string" ? p.approvalId : undefined);
        parts.push({
          type: "tool-call",
          toolCallId: callId,
          toolName,
          args,
          state,
          needsApproval: !!p.needsApproval,
          ...(approvalId ? { approvalId } : {}),
        });
        if (
          (p.state === "output-available" || p.output !== undefined) &&
          p.output !== undefined
        ) {
          parts.push({
            type: "tool-result",
            toolCallId: callId,
            toolName,
            result: p.output,
          });
        }
      } else if (t === "tool-result") {
        parts.push({
          type: "tool-result",
          toolCallId: p.toolCallId,
          toolName: p.toolName ?? "",
          result: p.result,
        });
      } else if (t === "file" || t === "image") {
        // AI SDK file/image part shapes:
        //   image: { type:"image", image: <url|bytes>, mediaType }
        //   file:  { type:"file",  data: <url|bytes>,  mediaType, filename? }
        // We stash custom name/size/storageId in providerOptions.wikipefia
        // when saving the message (see buildUserContent on the server).
        const wmeta =
          (p.providerOptions?.wikipefia ?? p.metadata?.wikipefia ?? {}) as {
            storageId?: string;
            name?: string;
            size?: number;
          };
        const dataField = p.image ?? p.data ?? p.url;
        const url = typeof dataField === "string" ? dataField : undefined;
        parts.push({
          type: "file",
          storageId: wmeta.storageId ?? "",
          name: wmeta.name ?? p.filename ?? p.name ?? "file",
          mimeType: p.mediaType ?? p.mimeType ?? (t === "image" ? "image/*" : "application/octet-stream"),
          size: wmeta.size ?? p.size ?? 0,
          url,
        });
      }
    }
  } else if (typeof m.text === "string" && m.text.length > 0) {
    parts.push({ type: "text", text: m.text });
  }

  const status: MessageStatus =
    m.status === "streaming"
      ? "streaming"
      : m.status === "pending"
        ? "pending"
        : m.status === "failed" || m.status === "error"
          ? "error"
          : "complete";

  return {
    id: m._id ?? m.id ?? m.key ?? `m-${m._creationTime ?? Date.now()}`,
    // m.threadId is undefined on the agent's UIMessage shape (the type
    // omits it). Fall back to the threadId we know from the query.
    threadId: typeof m.threadId === "string" ? m.threadId : threadIdFallback,
    role: m.role,
    parts,
    status,
    errorMessage: m.errorMessage,
    createdAt: m._creationTime ?? m.createdAt ?? Date.now(),
    usage: m.usage,
    model: typeof m.model === "string" ? m.model : undefined,
    provider: typeof m.provider === "string" ? m.provider : undefined,
  };
}
