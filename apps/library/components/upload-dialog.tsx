"use client";

import { api } from "@wikipefia/convex/api";
import { useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/metadata";
import { useUploadThing } from "@/lib/uploadthing";

/**
 * Modal form to upload a file with rich metadata. The file goes to UploadThing
 * with the metadata as `input`; the server-side `onUploadComplete` callback
 * ingests it into Convex Storage. The new file appears in the list reactively
 * (Convex subscription) — no manual refresh needed.
 */
export function UploadDialog({ onClose }: { onClose: () => void }) {
  const subjects = useQuery(api.library.subjects.list);

  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [language, setLanguage] = useState("");
  const [year, setYear] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [customFields, setCustomFields] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("libraryUploader", {
    onClientUploadComplete: () => {
      onClose();
    },
    onUploadError: (e) => {
      setError(e.message);
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Choose a file to upload.");
    if (!subjectId) return setError("Pick a subject.");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const customFieldsObj: Record<string, string> = {};
    for (const { key, value } of customFields) {
      const k = key.trim();
      if (k) customFieldsObj[k] = value;
    }

    await startUpload([file], {
      subjectId,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      documentType,
      language: language.trim() || undefined,
      year: year ? Number(year) : undefined,
      authorName: authorName.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      pageCount: pageCount ? Number(pageCount) : undefined,
      tags: tags.length ? tags : undefined,
      customFields: Object.keys(customFieldsObj).length
        ? customFieldsObj
        : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-xl rounded-lg border border-[var(--c-border)] bg-[var(--c-bg-white)] p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload a file</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <Field label="File *">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </Field>

          <Field label="Subject *">
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a subject…</option>
              {subjects?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the filename"
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
                onChange={(e) =>
                  setDocumentType(e.target.value as DocumentType)
                }
                className={selectClass}
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
                placeholder="en, ru, …"
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

          <Field label="Tags (comma-separated)">
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="calculus, midterm, 2024"
              className={inputClass}
            />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--c-text-muted)]">
                Custom fields
              </span>
              <button
                type="button"
                onClick={() =>
                  setCustomFields((f) => [
                    ...f,
                    { id: crypto.randomUUID(), key: "", value: "" },
                  ])
                }
                className="text-xs text-[var(--c-accent)] hover:underline"
              >
                + Add field
              </button>
            </div>
            {customFields.map((cf) => (
              <div key={cf.id} className="mb-2 flex gap-2">
                <input
                  value={cf.key}
                  onChange={(e) =>
                    setCustomFields((arr) =>
                      arr.map((x) =>
                        x.id === cf.id ? { ...x, key: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="key"
                  className={inputClass}
                />
                <input
                  value={cf.value}
                  onChange={(e) =>
                    setCustomFields((arr) =>
                      arr.map((x) =>
                        x.id === cf.id ? { ...x, value: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="value"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    setCustomFields((arr) => arr.filter((x) => x.id !== cf.id))
                  }
                  className="px-2 text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="rounded-md bg-[var(--c-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--c-accent)]";
const selectClass = inputClass;

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
