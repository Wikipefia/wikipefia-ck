"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import type { MessagePart } from "../../../types";

interface FilePartProps {
  part: Extract<MessagePart, { type: "file" }>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "▣";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("text/")) return "≡";
  return "◇";
}

export function FilePart({ part }: FilePartProps) {
  const isImage = part.mimeType.startsWith("image/");
  const icon = getIcon(part.mimeType);

  if (isImage && part.url) {
    return (
      <figure
        className="my-3 border"
        style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
      >
        <img
          src={part.url}
          alt={part.name}
          className="block max-w-full max-h-[320px] object-contain mx-auto"
        />
        <figcaption
          className="px-3 py-1.5 text-[10px] uppercase tracking-wider border-t"
          style={{
            borderColor: C.borderLight,
            color: C.textMuted,
            fontFamily: "var(--font-mono)",
          }}
        >
          {icon} {part.name} · {formatSize(part.size)}
        </figcaption>
      </figure>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 border px-2.5 py-1.5 my-2 text-[11px]"
      style={{
        borderColor: C.borderLight,
        backgroundColor: C.bg,
        color: C.text,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span>{icon}</span>
      <span className="font-bold uppercase tracking-wider">{part.name}</span>
      <span style={{ color: C.textMuted }}>{formatSize(part.size)}</span>
    </div>
  );
}
