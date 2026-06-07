"use client";

import { api } from "@wikipefia/convex/api";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Btn } from "@/components/ui/kit";
import { C } from "@/lib/theme";
import type { ProjectDoc, ProjectType } from "@/lib/types";

const TYPES: ProjectType[] = ["subject", "teacher", "system"];

const mono = { fontFamily: "var(--font-mono)" } as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block mb-3">
      <span
        className="block text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5"
        style={{ ...mono, color: C.textMuted }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-2.5 py-1.5 text-[12px] border outline-none transition-colors";

export function SubjectDialog({
  mode,
  project,
  onClose,
}: {
  mode: "create" | "edit";
  project?: ProjectDoc;
  onClose: () => void;
}) {
  const create = useMutation(api.projects.create);
  const update = useMutation(api.projects.update);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [slug, setSlug] = useState(project?.slug ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [githubRepo, setGithubRepo] = useState(project?.githubRepo ?? "");
  const [branch, setBranch] = useState(project?.branch ?? "main");
  const [type, setType] = useState<ProjectType>(project?.type ?? "subject");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    name.trim() &&
    githubRepo.trim() &&
    branch.trim() &&
    (mode === "edit" || /^[a-z0-9-]+$/.test(slug));

  const handleSubmit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        await create({ slug, name, description, githubRepo, branch, type });
      } else if (project) {
        await update({
          id: project._id,
          name,
          description,
          githubRepo,
          branch,
          type,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    ...mono,
    backgroundColor: C.bgWhite,
    borderColor: C.borderLight,
    color: C.text,
  } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — a real button so click/Enter close the dialog accessibly. */}
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md border"
        style={{ backgroundColor: C.bgWhite, borderColor: C.border }}
      >
        <div
          className="px-5 py-3 border-b"
          style={{ borderColor: C.borderLight }}
        >
          <h2
            className="text-[12px] font-bold uppercase tracking-[0.1em]"
            style={{ ...mono, color: C.text }}
          >
            {mode === "create" ? "New project" : `Edit · ${project?.slug}`}
          </h2>
        </div>

        <div className="px-5 py-4">
          {mode === "create" && (
            <Field label="Slug (a-z, 0-9, -)">
              <input
                className={inputClass}
                style={inputStyle}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="discrete-mathematics"
              />
            </Field>
          )}
          <Field label="Name">
            <input
              className={inputClass}
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Discrete Mathematics"
            />
          </Field>
          <Field label="Description">
            <input
              className={inputClass}
              style={inputStyle}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="GitHub repo (owner/name)">
            <input
              className={inputClass}
              style={inputStyle}
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="wikipefia/subject-discrete-mathematics"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Branch">
              <input
                className={inputClass}
                style={inputStyle}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </Field>
            <Field label="Type">
              <select
                className={inputClass}
                style={inputStyle}
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && (
            <p
              className="text-[10px] mt-1 mb-2"
              style={{ ...mono, color: "#DC2626" }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="px-5 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: C.borderLight }}
        >
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={handleSubmit}
            disabled={!valid || saving}
          >
            {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
