"use client";

import {
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import type { AttachmentRef, ModelDef } from "../../types";
import type { ModeDefinition } from "@wikipefia/chat/modes";
import { Button } from "./primitives/Button";
import { IconButton } from "./primitives/IconButton";
import { useUploadFile } from "../hooks/use-upload";
import { FilePart } from "./parts/FilePart";
import { ModePicker } from "./ModePicker";
import { ModeSettingsPanel } from "./ModeSettingsPanel";

/**
 * When provided, MessageInput shows a "+" trigger that opens a mode-picker
 * dropdown. Selecting a non-default mode reveals an inline settings panel.
 *
 * Used on the new-thread composer (apps/wikipefia-chat/app/page.tsx).
 * Inside a thread (`ThreadView`), this prop is intentionally NOT passed —
 * the mode is locked at thread creation time.
 */
export interface MessageInputModePickerConfig {
  modes: ModeDefinition[];
  selectedId: string;
  settings: Record<string, unknown>;
  onSelect: (modeId: string, defaults: Record<string, unknown>) => void;
  onSettingChange: (key: string, value: unknown) => void;
  locale?: "en" | "ru";
}

interface MessageInputProps {
  onSend: (text: string, attachments: AttachmentRef[]) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  /** When provided, used to filter incompatible files (e.g. PDF on non-PDF model). */
  currentModel?: ModelDef;
  /** Optional mode picker (only shown on new-thread composer). */
  modePicker?: MessageInputModePickerConfig;
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = "Ask anything…",
  currentModel,
  modePicker,
}: MessageInputProps) {
  // Resolve the currently-selected mode (if a picker is wired). The
  // settings panel only shows for non-default modes — default mode has
  // no settings and no panel.
  const selectedMode = modePicker
    ? modePicker.modes.find((m) => m.id === modePicker.selectedId) ?? null
    : null;
  const showSettingsPanel =
    selectedMode &&
    selectedMode.id !== "default" &&
    selectedMode.settings.length > 0;

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<
    Array<AttachmentRef & { url?: string }>
  >([]);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { upload, uploading, error: uploadError } = useUploadFile();

  // Send is enabled when EITHER text or attachments are present. Allowing
  // attachments-only sends supports the tutor-mode workflow where the user
  // uploads a study file and just hits send — the model picks up the
  // material on its own (the system prompt tells it how).
  const canSend =
    !disabled &&
    !sending &&
    (text.trim().length > 0 || attachments.length > 0);

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(text, attachments);
      setText("");
      setAttachments([]);
    } finally {
      setSending(false);
    }
  }, [canSend, onSend, text, attachments]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends; Shift+Enter inserts a newline (default textarea behavior).
      // Cmd/Ctrl+Enter also sends, for keyboard-shortcut muscle memory.
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        // Optional model-capability check
        if (file.type === "application/pdf" && currentModel && !currentModel.supportsPDF) {
          alert(
            `Model ${currentModel.label} doesn't support PDFs. Switch model first.`,
          );
          continue;
        }
        if (file.type.startsWith("image/") && currentModel && !currentModel.supportsImages) {
          alert(`Model ${currentModel.label} doesn't support images.`);
          continue;
        }
        const ref = await upload(file);
        if (ref) {
          const url = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined;
          setAttachments((prev) => [...prev, { ...ref, url }]);
        }
      }
    },
    [upload, currentModel],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const removeAttachment = (storageId: string) => {
    setAttachments((prev) => prev.filter((a) => a.storageId !== storageId));
  };

  return (
    <div
      className="border-2 flex flex-col"
      style={{
        borderColor: dragOver ? C.accent : C.border,
        backgroundColor: C.bgWhite,
        transition: "border-color 0.15s",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {showSettingsPanel && selectedMode ? (
        <ModeSettingsPanel
          mode={selectedMode}
          values={modePicker!.settings}
          onChange={modePicker!.onSettingChange}
          locale={modePicker!.locale ?? "ru"}
          disabled={disabled || sending}
        />
      ) : null}

      {attachments.length > 0 ? (
        <div
          className="flex flex-wrap gap-2 px-3 py-2 border-b"
          style={{ borderColor: C.borderLight }}
        >
          {attachments.map((a) => (
            <div key={a.storageId} className="flex items-center gap-1">
              <FilePart
                part={{
                  type: "file",
                  storageId: a.storageId,
                  name: a.name,
                  mimeType: a.mimeType,
                  size: a.size,
                  url: a.url,
                }}
              />
              <button
                type="button"
                onClick={() => removeAttachment(a.storageId)}
                className="text-[12px] px-1"
                style={{ color: C.textMuted }}
                aria-label={`Remove ${a.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || sending}
        rows={Math.min(8, Math.max(2, text.split("\n").length))}
        className="px-4 py-3 outline-none resize-none text-[15px] disabled:opacity-50"
        style={{
          fontFamily: "var(--font-serif)",
          backgroundColor: C.bgWhite,
          color: C.text,
        }}
      />

      <div
        className="flex items-center justify-between px-3 py-2 border-t"
        style={{ borderColor: C.borderLight }}
      >
        <div className="flex items-center gap-1">
          {modePicker ? (
            <ModePicker
              modes={modePicker.modes}
              selectedId={modePicker.selectedId}
              onSelect={modePicker.onSelect}
              locale={modePicker.locale ?? "ru"}
              disabled={disabled || sending}
            />
          ) : null}
          <IconButton
            aria-label="Attach files"
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach files"
          >
            ◧
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
            >
              Uploading…
            </span>
          ) : null}
          {uploadError ? (
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "#DC2626", fontFamily: "var(--font-mono)" }}
            >
              ✕ {uploadError}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
          >
            Enter
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={send}
            disabled={!canSend}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
