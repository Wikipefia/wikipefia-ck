/** Shared metadata constants for the library UI + UploadThing input schema. */

export const DOCUMENT_TYPES = [
  "lecture",
  "textbook",
  "exam",
  "notes",
  "article",
  "presentation",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Short mono code shown in the bordered type badge on cards/detail. */
export const DOCUMENT_TYPE_CODE: Record<DocumentType, string> = {
  lecture: "LEC",
  textbook: "TXT",
  exam: "EXM",
  notes: "NTS",
  article: "ART",
  presentation: "PRE",
  other: "DOC",
};

export function documentTypeCode(type: string): string {
  return DOCUMENT_TYPE_CODE[type as DocumentType] ?? "DOC";
}

/** Human-readable label per transcription status. */
export const TRANSCRIPTION_LABEL: Record<string, string> = {
  none: "No transcript",
  pending: "Queued",
  processing: "Transcribing",
  completed: "Transcribed",
  failed: "Failed",
};

/** Accent color per transcription status (CSS color string). */
export const TRANSCRIPTION_COLOR: Record<string, string> = {
  none: "var(--c-text-muted)",
  pending: "#d97706",
  processing: "#2563eb",
  completed: "#16a34a",
  failed: "#dc2626",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}
