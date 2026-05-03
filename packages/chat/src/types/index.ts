/**
 * Public types for @wikipefia/chat.
 *
 * These describe the shape of threads, messages, and message parts that flow
 * through the chat package. The package itself doesn't depend on Convex —
 * a backend implementation provides these via the ChatTransport interface.
 */

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type MessagePartState = "partial" | "complete";

/**
 * One discrete chunk of a message. Assistant messages are sequences of these.
 *
 * - `text` parts contain markdown-only prose (safe to render at any prefix).
 * - `tool-call` parts represent widget invocations or other tool uses by the model.
 *   When `state === "partial"` args are still streaming; UI shows a skeleton.
 * - `tool-result` parts hold the result of a tool call (e.g. user's quiz answer).
 * - `reasoning` parts hold model reasoning if exposed by the provider.
 * - `file` parts represent attachments uploaded with user messages.
 */
export type MessagePart =
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: unknown;
      state: MessagePartState;
      /** When the tool needs human approval ("Quiz" pattern), this is true while pending. */
      needsApproval?: boolean;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      result: unknown;
    }
  | { type: "reasoning"; text: string }
  | {
      type: "file";
      storageId: string;
      name: string;
      mimeType: string;
      size: number;
      url?: string;
    };

export type MessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error";

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  model: string;
  stepCount: number;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  parts: MessagePart[];
  status: MessageStatus;
  errorMessage?: string;
  createdAt: number;
  /** Present on assistant messages once complete. */
  usage?: AIUsage;
  /** OpenRouter model id used to generate this message (assistant only). */
  model?: string;
  /** Provider name (e.g. "openai", "anthropic") if recorded. */
  provider?: string;
}

export type ThreadStatus =
  | "idle"
  | "generating"
  | "awaiting_user"
  | "error";

export interface Thread {
  id: string;
  title: string;
  status: ThreadStatus;
  modelId: string;
  systemPromptVersion: string;
  createdAt: number;
  updatedAt: number;
}

export interface AttachmentRef {
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface ModelDef {
  id: string;
  label: string;
  provider: string;
  supportsImages: boolean;
  supportsPDF: boolean;
  contextWindow: number;
  defaultForNewThreads?: boolean;
}

/** Format options for debug export of a thread. */
export type ExportFormat = "json" | "markdown" | "replay";

export type {
  ChatTransport,
  ListThreadsResult,
  ListMessagesResult,
  CreateThreadOptions,
} from "./transport";
