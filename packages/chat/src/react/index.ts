// Re-export barrel — NOT marked "use client" so the bundler can tree-shake
// individual exports. Each component file declares its own "use client" where
// needed; client-only components are still client-only when imported through
// this barrel.

// ── Transport context ──
export {
  ChatTransportProvider,
  useChatTransport,
  useChatConfig,
  useDefaultModel,
  type ChatHostConfig,
  type ChatTransportProviderProps,
} from "./transport-context";

// ── Hooks ──
export {
  useThreads,
  useThread,
  useCreateThread,
  useDeleteThread,
  useRenameThread,
  useSetThreadModel,
} from "./hooks/use-threads";
export {
  useMessages,
  useSendMessage,
  useEditAndRegenerate,
  useRegenerateMessage,
  useCancelGeneration,
  useSubmitToolResponse,
} from "./hooks/use-messages";
export { useUploadFile } from "./hooks/use-upload";
export { useExportThread } from "./hooks/use-export";
export { useSessionId } from "./hooks/use-session-id";

// ── Components ──
export { ChatLayout } from "./components/ChatLayout";
export { ThreadSidebar } from "./components/ThreadSidebar";
export { ThreadView } from "./components/ThreadView";
export { Message } from "./components/Message";
export { MessageList } from "./components/MessageList";
export { MessageInput } from "./components/MessageInput";
export { MessageEditor } from "./components/MessageEditor";
export { ModelPicker } from "./components/ModelPicker";
export { DebugExportMenu } from "./components/DebugExportMenu";
export { TypingIndicator } from "./components/TypingIndicator";
export { ErrorBanner } from "./components/ErrorBanner";

// ── Parts ──
export { TextPart } from "./components/parts/TextPart";
export { ToolCallPart } from "./components/parts/ToolCallPart";
export { ToolResultPart } from "./components/parts/ToolResultPart";
export { FilePart } from "./components/parts/FilePart";
export { ReasoningPart } from "./components/parts/ReasoningPart";

// ── Widgets (heavy — also lazy-loaded internally by ToolCallPart) ──
export { WidgetSkeleton } from "./components/widgets/WidgetSkeleton";
// NOTE: WidgetRenderer and InteractiveQuiz are intentionally NOT re-exported
// here. They live behind ToolCallPart's React.lazy() boundary so the heavy
// 35+ widget components from @wikipefia/mdx-renderer don't enter the main
// bundle. If you need them directly, import the file paths.

// ── Primitives ──
export { Button, type ButtonProps } from "./components/primitives/Button";
export { IconButton } from "./components/primitives/IconButton";
export { HeaderBar } from "./components/primitives/HeaderBar";
