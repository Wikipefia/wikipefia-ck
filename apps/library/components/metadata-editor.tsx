"use client";

import { api } from "@wikipefia/convex/api";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/metadata";
import type { LibraryFileDetail } from "@/lib/types";

/** Inline editor for a file's mutable metadata fields. */
export function MetadataEditor({
  file,
  onDone,
}: {
  file: LibraryFileDetail;
  onDone: () => void;
}) {
  const update = useMutation(api.library.files.updateMetadata);

  const [title, setTitle] = useState(file.title);
  const [description, setDescription] = useState(file.description ?? "");
  const [documentType, setDocumentType] = useState<DocumentType>(
    file.documentType as DocumentType,
  );
  const [language, setLanguage] = useState(file.language ?? "");
  const [year, setYear] = useState(
    file.year !== undefined ? String(file.year) : "",
  );
  const [authorName, setAuthorName] = useState(file.authorName ?? "");
  const [sourceUrl, setSourceUrl] = useState(file.sourceUrl ?? "");
  const [pageCount, setPageCount] = useState(
    file.pageCount !== undefined ? String(file.pageCount) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await update({
      fileId: file._id,
      title: title.trim() || file.originalName,
      description: description.trim() || undefined,
      documentType,
      language: language.trim() || undefined,
      year: year ? Number(year) : undefined,
      authorName: authorName.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      pageCount: pageCount ? Number(pageCount) : undefined,
    });
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Document type">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className={inputClass}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Year">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Page count">
          <input
            type="number"
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Author (source)">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Source URL">
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-4 py-2 text-sm text-[var(--c-text-muted)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[var(--c-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--c-accent)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is nested via `children`.
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--c-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
