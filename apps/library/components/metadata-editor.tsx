"use client";

import { api } from "@wikipefia/convex/api";
import { Button, Field, Input, Select, Textarea } from "@wikipefia/ui";
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
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      // Send raw values: empty text / empty number ⇒ the field is cleared
      // server-side. `try/finally` guarantees the form never stays disabled.
      await update({
        fileId: file._id,
        title: title.trim() || file.originalName,
        description,
        documentType,
        language,
        authorName,
        sourceUrl,
        year: year.trim() === "" ? null : Number(year),
        pageCount: pageCount.trim() === "" ? null : Number(pageCount),
      });
      onDone();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn’t save changes",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Language">
          <Input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </Field>
        <Field label="Year">
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </Field>
        <Field label="Pages">
          <Input
            type="number"
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
          />
        </Field>
        <Field label="Author (source)">
          <Input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        </Field>
        <Field label="Source URL">
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </Field>
      </div>
      {saveError && <p className="text-[12px] text-danger">{saveError}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
