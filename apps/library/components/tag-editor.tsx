"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { Badge, Button, Input } from "@wikipefia/ui";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
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
    // Keep the typed tag until the server confirms the add.
    try {
      await addTag({ fileId, tag });
      setValue("");
    } catch {
      // Leave the draft for the user to retry.
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <span
            className="text-[11px] uppercase tracking-[0.12em] text-muted"
            style={{ fontFamily: FONT.mono }}
          >
            No tags
          </span>
        )}
        {tags.map((tag) => (
          <Badge key={tag} className="gap-1.5 normal-case tracking-wide">
            #{tag}
            <button
              type="button"
              onClick={() => {
                removeTag({ fileId, tag }).catch(() => {});
              }}
              className="text-muted transition-colors hover:text-danger"
              aria-label={`Remove tag ${tag}`}
            >
              ✕
            </button>
          </Badge>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex max-w-sm gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a tag…"
          aria-label="Add a tag"
        />
        <Button type="submit" variant="outline" size="sm" className="shrink-0">
          Add
        </Button>
      </form>
    </div>
  );
}
