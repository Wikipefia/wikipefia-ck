"use client";

import { api } from "@wikipefia/convex/api";
import { Button, Field, Input, Modal, Select } from "@wikipefia/ui";
import { useMutation } from "convex/react";
import { useState } from "react";
import { C } from "@/lib/theme";
import type { ProjectDoc, ProjectType } from "@/lib/types";

const TYPES: ProjectType[] = ["subject", "teacher", "system"];

const mono = { fontFamily: "var(--font-mono)" } as const;

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

  return (
    <Modal
      open
      onClose={onClose}
      align="center"
      className="max-w-md"
      aria-label={mode === "create" ? "New project" : "Edit project"}
    >
      <div
        className="border-b px-5 py-3"
        style={{ borderColor: C.borderLight }}
      >
        <h2
          className="text-[12px] font-bold uppercase tracking-[0.1em] text-fg"
          style={mono}
        >
          {mode === "create" ? "New project" : `Edit · ${project?.slug}`}
        </h2>
      </div>

      <div className="flex flex-col gap-3 px-5 py-4">
        {mode === "create" && (
          <Field label="Slug (a-z, 0-9, -)" htmlFor="sd-slug">
            <Input
              id="sd-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="discrete-mathematics"
            />
          </Field>
        )}
        <Field label="Name" htmlFor="sd-name">
          <Input
            id="sd-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Discrete Mathematics"
          />
        </Field>
        <Field label="Description" htmlFor="sd-desc">
          <Input
            id="sd-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="GitHub repo (owner/name)" htmlFor="sd-repo">
          <Input
            id="sd-repo"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            placeholder="wikipefia/subject-discrete-mathematics"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch" htmlFor="sd-branch">
            <Input
              id="sd-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </Field>
          <Field label="Type" htmlFor="sd-type">
            <Select
              id="sd-type"
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {error && (
          <p className="text-[10px] text-danger" style={mono}>
            {error}
          </p>
        )}
      </div>

      <div
        className="flex items-center justify-end gap-2 border-t px-5 py-3"
        style={{ borderColor: C.borderLight }}
      >
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!valid || saving}
        >
          {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
