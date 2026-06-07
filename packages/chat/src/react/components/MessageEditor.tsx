"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type DragEvent,
} from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import { Button } from "./primitives/Button";
import { IconButton } from "./primitives/IconButton";
import { Textarea } from "@wikipefia/ui";
import { ModelPicker } from "./ModelPicker";
import { FilePart } from "./parts/FilePart";
import { useEditAndRegenerate } from "../hooks/use-messages";
import { useUploadFile } from "../hooks/use-upload";
import { useChatConfig } from "../transport-context";
import type { AttachmentRef, ModelDef } from "../../types";

interface MessageEditorProps {
  messageId: string;
  initialText: string;
  /** Existing attachments on the message — kept by default, removable here. */
  initialAttachments?: Array<AttachmentRef & { url?: string }>;
  /** Initial model id (the thread's current model). */
  initialModelId?: string;
  onCancel: () => void;
  onSubmitted: () => void;
}

/**
 * Inline editor that opens over a user message. Lets the author:
 *   - rewrite the text
 *   - add / remove attachments
 *   - swap the model used for the regenerated response
 *
 * On submit, calls editAndRegenerate which updates the message, deletes
 * subsequent messages, and triggers a new agent run.
 */
export function MessageEditor({
  messageId,
  initialText,
  initialAttachments = [],
  initialModelId,
  onCancel,
  onSubmitted,
}: MessageEditorProps) {
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState<
    Array<AttachmentRef & { url?: string }>
  >(initialAttachments);
  const [modelId, setModelId] = useState<string>(
    initialModelId ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const editAndRegenerate = useEditAndRegenerate();
  const config = useChatConfig();
  const { upload, uploading, error: uploadError } = useUploadFile();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resolve the currently-selected model for capability gating.
  const currentModel: ModelDef | undefined =
    config.models.find((m) => m.id === modelId) ?? config.models[0];

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(text.length, text.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Attachment helpers ───────────────────────────────────────
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (
          file.type === "application/pdf" &&
          currentModel &&
          !currentModel.supportsPDF
        ) {
          alert(
            `Model ${currentModel.label} doesn't support PDFs. Switch model first.`,
          );
          continue;
        }
        if (
          file.type.startsWith("image/") &&
          currentModel &&
          !currentModel.supportsImages
        ) {
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

  // ── Submit ───────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (text.trim().length === 0 || submitting) return;

    // No-op short-circuit: if literally nothing changed, just close.
    const sameText = text === initialText;
    const initialIds = initialAttachments.map((a) => a.storageId).join("|");
    const currentIds = attachments.map((a) => a.storageId).join("|");
    const sameAttachments = sameText && initialIds === currentIds;
    const sameModel = !modelId || modelId === initialModelId;
    if (sameText && sameAttachments && sameModel) {
      onCancel();
      return;
    }

    setSubmitting(true);
    try {
      const cleanAttachments: AttachmentRef[] = attachments.map(
        ({ storageId, name, mimeType, size }) => ({
          storageId,
          name,
          mimeType,
          size,
        }),
      );
      await editAndRegenerate(messageId, text, {
        attachments: cleanAttachments,
        ...(modelId && modelId !== initialModelId ? { modelId } : {}),
      });
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }, [
    text,
    initialText,
    attachments,
    initialAttachments,
    modelId,
    initialModelId,
    submitting,
    editAndRegenerate,
    messageId,
    onSubmitted,
    onCancel,
  ]);

  return (
    <div
      className="flex flex-col gap-2"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        outline: dragOver ? `2px dashed ${C.accent}` : "none",
        outlineOffset: 4,
      }}
    >
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        rows={Math.min(12, Math.max(2, text.split("\n").length))}
        className="px-3 py-2 text-[14px] resize-y"
        style={{
          fontFamily: "var(--font-serif)",
          borderColor: C.border,
          backgroundColor: C.bgWhite,
          color: C.text,
        }}
      />

      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
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
                className="text-[12px] px-1 hover:opacity-70 cursor-pointer"
                style={{ color: C.textMuted }}
                aria-label={`Remove ${a.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconButton
            aria-label="Attach files"
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || submitting}
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
          {config.models.length > 0 ? (
            <ModelPicker
              models={config.models}
              currentId={modelId || (currentModel?.id ?? config.models[0].id)}
              onSelect={setModelId}
              disabled={submitting}
            />
          ) : null}
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
          <Button onClick={onCancel} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            onClick={submit}
            variant="primary"
            size="sm"
            disabled={submitting || text.trim().length === 0}
          >
            {submitting ? "Regenerating…" : "Save & regenerate"}
          </Button>
        </div>
      </div>

      <div
        className="text-[10px] uppercase tracking-wider"
        style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
      >
        ⌘+Enter to save · Esc to cancel · drop files anywhere on this editor
      </div>
    </div>
  );
}
