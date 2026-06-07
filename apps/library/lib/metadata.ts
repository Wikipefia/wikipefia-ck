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

/** Emoji icon per document type — used on file cards. */
export const DOCUMENT_TYPE_ICON: Record<DocumentType, string> = {
  lecture: "🎓",
  textbook: "📚",
  exam: "📝",
  notes: "🗒️",
  article: "📄",
  presentation: "📊",
  other: "📁",
};

/** Human-readable label for a transcription status. */
export const TRANSCRIPTION_LABEL: Record<string, string> = {
  none: "No transcription",
  pending: "Transcription pending",
  processing: "Transcribing…",
  completed: "Transcribed",
  failed: "Transcription failed",
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
