"use client";

import { api } from "@wikipefia/convex/api";
import {
  Button,
  Field,
  Input,
  Label,
  Modal,
  ProgressButton,
  Select,
  Textarea,
} from "@wikipefia/ui";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { expandFiles } from "@/lib/expand-files";
import { DOCUMENT_TYPES, type DocumentType, formatBytes } from "@/lib/metadata";
import { C, FONT } from "@/lib/theme";
import { useLibraryUpload } from "@/lib/use-library-upload";

/**
 * Upload modal optimized for minimum friction: drop files → press Upload.
 * Supports multiple files at once, and archives (.zip) are expanded in the
 * browser so each entry becomes its own material. Subject is pre-filled (or
 * locked from a subject page); other metadata defaults server-side. Shared
 * fields (subject, type, tags…) apply to every file in the batch; each file's
 * title is taken from its filename.
 */
export function UploadDialog({
  onClose,
  lockedSubjectId,
}: {
  onClose: () => void;
  /** When set, the subject is fixed (opened from that subject's page). */
  lockedSubjectId?: string;
}) {
  const subjects = useQuery(api.library.subjects.list);

  const [files, setFiles] = useState<File[]>([]);
  const [expanding, setExpanding] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [subjectId, setSubjectId] = useState(lockedSubjectId ?? "");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
  const [formError, setFormError] = useState<string | null>(null);

  const dragDepth = useRef(0);
  const upload = useLibraryUpload(onClose);
  const uploading =
    upload.status === "uploading" || upload.status === "finalizing";
  const single = files.length === 1;

  // Swallow the browser's default file-drop (navigate to file) anywhere over
  // the modal, including the backdrop — the form's own handler does the work.
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // Pre-select the first subject once the list loads (unless locked).
  useEffect(() => {
    if (!lockedSubjectId && !subjectId && subjects && subjects.length > 0) {
      setSubjectId(subjects[0]._id);
    }
  }, [subjects, subjectId, lockedSubjectId]);

  // With exactly one file, derive a friendly title from its name.
  useEffect(() => {
    if (single && !titleTouched) {
      setTitle(files[0].name.replace(/\.[^.]+$/, ""));
    }
  }, [files, single, titleTouched]);

  async function acceptFiles(list: File[]) {
    if (list.length === 0) return;
    setFormError(null);
    setExpanding(true);
    try {
      const expanded = await expandFiles(list);
      setFiles((prev) => [...prev, ...expanded]);
    } catch {
      setFormError("Couldn’t read one of the files.");
    } finally {
      setExpanding(false);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (files.length === 0) return setFormError("Add a file to upload.");
    if (!subjectId) return setFormError("Pick a subject.");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const customFieldsObj: Record<string, string> = {};
    for (const { key, value } of customFields) {
      const k = key.trim();
      if (k) customFieldsObj[k] = value;
    }

    await upload.start(files, {
      subjectId,
      // Per-file titles come from each filename; only honor the field for one.
      title: single ? title.trim() || undefined : undefined,
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

  const noSubjects = subjects !== undefined && subjects.length === 0;
  const lockedSubject = lockedSubjectId
    ? subjects?.find((s) => s._id === lockedSubjectId)
    : undefined;
  const shownError = formError ?? upload.error;
  const hasFiles = files.length > 0;

  const submitLabel =
    upload.status === "uploading"
      ? `Uploading… ${upload.progress.toFixed(1)}%`
      : upload.status === "finalizing"
        ? "Finalizing…"
        : upload.status === "error"
          ? "Try again"
          : files.length > 1
            ? `Upload ${files.length} files`
            : "Upload";

  return (
    <Modal
      open
      onClose={onClose}
      align="top"
      closeOnBackdrop={!uploading}
      closeOnEscape={!uploading}
      className={`max-w-lg ${dragOver ? "border-accent" : ""}`}
      aria-label="Upload files"
    >
      <form
        onSubmit={handleSubmit}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragOver(false);
          acceptFiles(Array.from(e.dataTransfer.files));
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
          <Label>
            {lockedSubject ? `Upload → ${lockedSubject.name}` : "Upload files"}
          </Label>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload dialog"
            className="text-muted transition-colors hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-5 py-5">
          {/* Dropzone — tints accent once files are attached. */}
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 border px-4 py-7 text-center transition-colors ${
              hasFiles ? "" : "border-dashed"
            }`}
            style={{
              borderColor: hasFiles || dragOver ? C.accent : C.border,
              backgroundColor: hasFiles
                ? "color-mix(in srgb, var(--c-accent) 9%, transparent)"
                : "transparent",
            }}
          >
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                acceptFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            {expanding ? (
              <span
                className="text-[13px] text-fg"
                style={{ fontFamily: FONT.mono }}
              >
                Expanding archive…
              </span>
            ) : hasFiles ? (
              <>
                <span
                  className="flex h-8 w-8 items-center justify-center text-[16px] leading-none text-white"
                  style={{ backgroundColor: C.accent }}
                >
                  ✓
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.22em] text-accent"
                  style={{ fontFamily: FONT.mono }}
                >
                  {files.length} {files.length === 1 ? "file" : "files"}{" "}
                  attached
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.15em] text-muted"
                  style={{ fontFamily: FONT.mono }}
                >
                  Click or drop to add more
                </span>
              </>
            ) : (
              <>
                <span
                  className="text-2xl leading-none"
                  style={{ color: dragOver ? C.accent : C.textMuted }}
                >
                  ⤓
                </span>
                <span
                  className="text-[14px] text-fg"
                  style={{ fontFamily: FONT.mono }}
                >
                  {dragOver
                    ? "Drop to attach"
                    : "Drop files or a .zip — or click to browse"}
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.15em] text-muted"
                  style={{ fontFamily: FONT.mono }}
                >
                  Multiple files & archives · up to 256 MB each
                </span>
              </>
            )}
          </label>

          {/* Attached file list */}
          {hasFiles && (
            <ul className="max-h-44 divide-y divide-line-soft overflow-y-auto border border-line-soft">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}-${i}`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span
                    className="min-w-0 flex-1 truncate text-[12px] text-fg"
                    style={{ fontFamily: FONT.mono }}
                    title={f.name}
                  >
                    {f.name}
                  </span>
                  <span
                    className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-muted"
                    style={{ fontFamily: FONT.mono }}
                  >
                    {formatBytes(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-muted transition-colors hover:text-danger"
                    aria-label={`Remove ${f.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Subject — fixed when locked, otherwise a pre-filled select. */}
          {lockedSubject ? (
            <div className="flex flex-col gap-1">
              <Label>Subject</Label>
              <p
                className="text-[14px] text-fg"
                style={{ fontFamily: FONT.serif }}
              >
                {lockedSubject.name}
              </p>
            </div>
          ) : (
            <Field label="Subject">
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={noSubjects}
              >
                {subjects === undefined && <option value="">Loading…</option>}
                {noSubjects && <option value="">No subjects available</option>}
                {subjects?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <p
            className="text-[11px] leading-relaxed text-muted"
            style={{ fontFamily: FONT.mono }}
          >
            {files.length > 1
              ? "Each file becomes its own material — titles come from the filenames. Subject, tags & type below apply to all."
              : "That’s all you need — title & type are filled in automatically. Everything else can be added later."}
          </p>

          {/* Optional details disclosure */}
          <div className="border-t border-line-soft pt-3">
            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              className="flex w-full items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
              style={{ fontFamily: FONT.mono }}
            >
              <span
                className="inline-block transition-transform"
                style={{ transform: showDetails ? "rotate(90deg)" : "none" }}
              >
                ▸
              </span>
              {showDetails ? "Hide details" : "Add details (optional)"}
            </button>

            <AnimatePresence initial={false}>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-4">
                    {files.length > 1 ? (
                      <p
                        className="text-[11px] text-muted"
                        style={{ fontFamily: FONT.mono }}
                      >
                        Titles are taken from each filename for batch uploads.
                      </p>
                    ) : (
                      <Field label="Title">
                        <Input
                          value={title}
                          onChange={(e) => {
                            setTitle(e.target.value);
                            setTitleTouched(true);
                          }}
                          placeholder="Defaults to the filename"
                        />
                      </Field>
                    )}

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
                          onChange={(e) =>
                            setDocumentType(e.target.value as DocumentType)
                          }
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
                          placeholder="en, ru, …"
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

                    <Field label="Tags (comma-separated)">
                      <Input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="calculus, midterm, 2024"
                      />
                    </Field>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Custom fields</Label>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomFields((f) => [
                              ...f,
                              { id: crypto.randomUUID(), key: "", value: "" },
                            ])
                          }
                          className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-80"
                          style={{ fontFamily: FONT.mono }}
                        >
                          + Add
                        </button>
                      </div>
                      {customFields.map((cf) => (
                        <div key={cf.id} className="flex gap-2">
                          <Input
                            value={cf.key}
                            onChange={(e) =>
                              setCustomFields((arr) =>
                                arr.map((x) =>
                                  x.id === cf.id
                                    ? { ...x, key: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            placeholder="key"
                          />
                          <Input
                            value={cf.value}
                            onChange={(e) =>
                              setCustomFields((arr) =>
                                arr.map((x) =>
                                  x.id === cf.id
                                    ? { ...x, value: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            placeholder="value"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFields((arr) =>
                                arr.filter((x) => x.id !== cf.id),
                              )
                            }
                            className="shrink-0 px-2 text-muted transition-colors hover:text-fg"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {shownError && (
            <p
              className="text-[12px] text-danger"
              style={{ fontFamily: FONT.mono }}
            >
              {shownError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <ProgressButton
            type="submit"
            size="sm"
            progress={uploading ? upload.progress : 0}
            disabled={uploading || !hasFiles || expanding || noSubjects}
          >
            {submitLabel}
          </ProgressButton>
        </div>
      </form>
    </Modal>
  );
}
