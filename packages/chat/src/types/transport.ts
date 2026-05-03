/**
 * The ChatTransport interface defines the contract between the @wikipefia/chat
 * UI layer and any backend implementation. The Convex implementation lives in
 * `@wikipefia/chat/convex-transport`. A future studio integration could
 * implement this with a different backend without touching the React UI.
 */

import type {
  AttachmentRef,
  ChatMessage,
  ExportFormat,
  Thread,
} from "./index";

export interface ListThreadsResult {
  threads: Thread[];
  status: "loading" | "ready" | "error";
}

export interface ListMessagesResult {
  messages: ChatMessage[];
  status: "loading" | "ready" | "error";
  loadMore?: () => void;
}

export interface CreateThreadOptions {
  initialMessage: string;
  attachments: AttachmentRef[];
  modelId: string;
}

export interface ChatTransport {
  // ── Threads ────────────────────────────────────────────
  /** Reactive subscription to the user's threads. */
  useThreads(): ListThreadsResult;
  /** Reactive single-thread lookup. */
  useThread(threadId: string | null): Thread | null;
  /** Create a new thread, initial user message, and schedule generation. Returns the new thread id. */
  createThread(opts: CreateThreadOptions): Promise<{ threadId: string }>;
  deleteThread(threadId: string): Promise<void>;
  renameThread(threadId: string, title: string): Promise<void>;

  // ── Messages ───────────────────────────────────────────
  /** Reactive subscription to messages of a thread, with streaming deltas. */
  useMessages(threadId: string | null): ListMessagesResult;
  /** Append a user message + schedule agent generation. */
  sendMessage(
    threadId: string,
    content: string,
    attachments: AttachmentRef[],
  ): Promise<void>;
  /** Change the model for an existing thread. Affects subsequent generations. */
  setThreadModel(threadId: string, modelId: string): Promise<void>;
  /**
   * Edit a user message (text + attachments + optional model) and re-run
   * generation from that point onward. Attachments default to an empty list
   * because we replace the message content; pass the original list through
   * to keep them.
   */
  editAndRegenerate(
    messageId: string,
    newContent: string,
    options?: { attachments?: AttachmentRef[]; modelId?: string },
  ): Promise<void>;
  /**
   * Re-run the agent from a user/assistant message WITHOUT modifying it.
   * - User message: regenerate the assistant response that followed it.
   * - Assistant message: regenerate the assistant response (deletes it and
   *   re-runs from the previous user message).
   * Optionally switches the thread model for the regeneration.
   */
  regenerateMessage(
    messageId: string,
    options?: { modelId?: string },
  ): Promise<void>;
  /** Request the running generation to abort. */
  cancelGeneration(threadId: string): Promise<void>;
  /**
   * Submit a user response to an interactive tool (e.g. Quiz answers).
   *
   * `approvalId` MUST be the AI SDK approvalId attached to the paused tool
   * call (not the toolCallId). Passing `null` is allowed for backwards
   * compatibility but the response will likely be auto-denied by the AI SDK.
   */
  submitToolResponse(
    messageId: string,
    toolCallId: string,
    response: unknown,
    approvalId?: string | null,
  ): Promise<void>;

  // ── Files ──────────────────────────────────────────────
  /** Upload a file and return its reference (storageId, name, mimeType, size). */
  uploadFile(file: File): Promise<AttachmentRef>;

  // ── Debug ──────────────────────────────────────────────
  /** Download the entire thread as a Blob in the requested format. */
  exportThread(threadId: string, format: ExportFormat): Promise<Blob>;
}
