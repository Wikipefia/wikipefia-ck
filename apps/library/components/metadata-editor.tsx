"use client";

import { api } from "@wikipefia/convex/api";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Btn, Field, inputCls, inputStyle } from "@/components/ui";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          style={inputStyle}
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputCls}
          style={inputStyle}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className={`${inputCls} cursor-pointer`}
            style={inputStyle}
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
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="Year">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="Pages">
          <input
            type="number"
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="Author (source)">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="Source URL">
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Btn type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Btn>
        <Btn type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Btn>
      </div>
    </form>
  );
}
