"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { inputCls, inputStyle } from "@/components/ui";
import { FONT } from "@/lib/theme";

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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <span
            className="text-[11px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]"
            style={{ fontFamily: FONT.mono }}
          >
            No tags
          </span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1.5 border border-[var(--c-border-light)] px-2 py-1 text-[10px] tracking-wide text-[var(--c-text)]"
            style={{ fontFamily: FONT.mono }}
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag({ fileId, tag })}
              className="text-[var(--c-text-muted)] transition-colors hover:text-red-500"
              aria-label={`Remove tag ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex max-w-sm gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a tag…"
          className={inputCls}
          style={inputStyle}
        />
        <button
          type="submit"
          className="shrink-0 border border-[var(--c-border)] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--c-text)] transition-colors hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
          style={{ fontFamily: FONT.mono }}
        >
          Add
        </button>
      </form>
    </div>
  );
}
