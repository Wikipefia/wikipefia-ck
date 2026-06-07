"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";

/** Add / remove tags on a file. Tags are normalized server-side. */
export function TagEditor({
  fileId,
  tags,
}: {
  fileId: Id<"libraryFiles">;
  tags: string[];
}) {
  const addTag = useMutation(api.library.tags.addTag);
  const removeTag = useMutation(api.library.tags.removeTag);
  const [value, setValue] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const tag = value.trim();
    if (!tag) return;
    setValue("");
    await addTag({ fileId, tag });
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <span className="text-sm text-[var(--c-text-muted)]">No tags</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-[var(--c-bg)] px-2.5 py-0.5 text-xs"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag({ fileId, tag })}
              className="text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
              aria-label={`Remove tag ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a tag…"
          className="flex-1 rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-1.5 text-sm outline-none focus:border-[var(--c-accent)]"
        />
        <button
          type="submit"
          className="rounded-md border border-[var(--c-border)] px-3 py-1.5 text-sm"
        >
          Add
        </button>
      </form>
    </div>
  );
}
