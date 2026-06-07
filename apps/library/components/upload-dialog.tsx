"use client";

import { api } from "@wikipefia/convex/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Btn,
  Field,
  inputCls,
  inputStyle,
  MonoLabel,
  ProgressButton,
} from "@/components/ui";
import { DOCUMENT_TYPES, type DocumentType, formatBytes } from "@/lib/metadata";
import { C, FONT } from "@/lib/theme";
import { useLibraryUpload } from "@/lib/use-library-upload";

/**
 * Upload modal optimized for minimum friction: drop a file → press Upload.
 * Subject is pre-filled (or locked when opened from a subject page), the title
 * is derived from the filename, and every other field defaults server-side.
 * Rich metadata lives behind an optional, collapsed "Add details" disclosure.
 *
 * The whole modal is a drop target, so the file can be dropped anywhere.
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

  const [file, setFile] = useState<File | null>(null);
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

  // Pre-select the first subject once the list loads (unless locked).
  useEffect(() => {
    if (!lockedSubjectId && !subjectId && subjects && subjects.length > 0) {
      setSubjectId(subjects[0]._id);
    }
  }, [subjects, subjectId, lockedSubjectId]);

  function acceptFile(f: File) {
    setFile(f);
    setFormError(null);
    if (!titleTouched) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!file) return setFormError("Drop a file to upload.");
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

    await upload.start(file, {
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

  const noSubjects = subjects !== undefined && subjects.length === 0;
  const lockedSubject = lockedSubjectId
    ? subjects?.find((s) => s._id === lockedSubjectId)
    : undefined;
  const shownError = formError ?? upload.error;

  const submitLabel =
    upload.status === "uploading"
      ? `Uploading… ${upload.progress.toFixed(1)}%`
      : upload.status === "finalizing"
        ? "Finalizing…"
        : upload.status === "error"
          ? "Try again"
          : "Upload";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.14 }}
        onClick={(e) => e.stopPropagation()}
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
          const f = e.dataTransfer.files?.[0];
          if (f) acceptFile(f);
        }}
        className="relative w-full max-w-lg border shadow-2xl transition-colors"
        style={{
          backgroundColor: C.bgWhite,
          borderColor: dragOver ? C.accent : C.border,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: C.borderLight }}
        >
          <MonoLabel>
            {lockedSubject ? `Upload → ${lockedSubject.name}` : "Upload file"}
          </MonoLabel>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-5 py-5">
          {/* Hero dropzone — switches to a clear "attached" state once a file
              is chosen (solid accent border + tint + checkmark). */}
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 border px-4 py-9 text-center transition-colors ${
              file ? "" : "border-dashed"
            }`}
            style={{
              borderColor: file || dragOver ? C.accent : C.border,
              backgroundColor: file
                ? "color-mix(in srgb, var(--c-accent) 9%, transparent)"
                : "transparent",
            }}
          >
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) acceptFile(f);
              }}
            />
            {file ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] leading-none text-white"
                  style={{ backgroundColor: C.accent }}
                >
                  ✓
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.22em]"
                  style={{ fontFamily: FONT.mono, color: C.accent }}
                >
                  File attached
                </span>
                <span
                  className="max-w-full truncate text-[14px] font-medium text-[var(--c-text)]"
                  style={{ fontFamily: FONT.mono }}
                >
                  {file.name}
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.15em] text-[var(--c-text-muted)]"
                  style={{ fontFamily: FONT.mono }}
                >
                  {formatBytes(file.size)} · click to replace
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
                  className="text-[14px] text-[var(--c-text)]"
                  style={{ fontFamily: FONT.mono }}
                >
                  {dragOver
                    ? "Drop to attach"
                    : "Drop a file or click to browse"}
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.15em] text-[var(--c-text-muted)]"
                  style={{ fontFamily: FONT.mono }}
                >
                  Any type · up to 256 MB
                </span>
              </>
            )}
          </label>

          {/* Subject — fixed when locked, otherwise a pre-filled select. */}
          {lockedSubject ? (
            <div className="space-y-1.5">
              <MonoLabel>Subject</MonoLabel>
              <p
                className="text-[14px] text-[var(--c-text)]"
                style={{ fontFamily: FONT.serif }}
              >
                {lockedSubject.name}
              </p>
            </div>
          ) : (
            <Field label="Subject">
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={noSubjects}
                className={`${inputCls} cursor-pointer`}
                style={inputStyle}
              >
                {subjects === undefined && <option value="">Loading…</option>}
                {noSubjects && <option value="">No subjects available</option>}
                {subjects?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <p
            className="text-[11px] leading-relaxed text-[var(--c-text-muted)]"
            style={{ fontFamily: FONT.mono }}
          >
            That’s all you need — title &amp; type are filled in automatically.
            Everything else can be added later.
          </p>

          {/* Optional details disclosure */}
          <div className="border-t pt-3" style={{ borderColor: C.borderLight }}>
            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              className="flex w-full items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-accent)]"
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
                    <Field label="Title">
                      <input
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          setTitleTouched(true);
                        }}
                        placeholder="Defaults to the filename"
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
                          onChange={(e) =>
                            setDocumentType(e.target.value as DocumentType)
                          }
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
                          placeholder="en, ru, …"
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

                    <Field label="Tags (comma-separated)">
                      <input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="calculus, midterm, 2024"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </Field>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <MonoLabel>Custom fields</MonoLabel>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomFields((f) => [
                              ...f,
                              { id: crypto.randomUUID(), key: "", value: "" },
                            ])
                          }
                          className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--c-accent)] transition-opacity hover:opacity-80"
                          style={{ fontFamily: FONT.mono }}
                        >
                          + Add
                        </button>
                      </div>
                      {customFields.map((cf) => (
                        <div key={cf.id} className="flex gap-2">
                          <input
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
                            className={inputCls}
                            style={inputStyle}
                          />
                          <input
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
                            className={inputCls}
                            style={inputStyle}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFields((arr) =>
                                arr.filter((x) => x.id !== cf.id),
                              )
                            }
                            className="shrink-0 px-2 text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]"
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
              className="text-[12px] text-red-500"
              style={{ fontFamily: FONT.mono }}
            >
              {shownError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 border-t px-5 py-3"
          style={{ borderColor: C.borderLight }}
        >
          <Btn
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Btn>
          <ProgressButton
            type="submit"
            progress={uploading ? upload.progress : 0}
            disabled={uploading || !file || noSubjects}
          >
            {submitLabel}
          </ProgressButton>
        </div>
      </motion.form>
    </motion.div>
  );
}
