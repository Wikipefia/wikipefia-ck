"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
import type { LibraryComment } from "@/lib/types";

/** Threaded comments for a file. The reply tree is built client-side. */
export function Comments({ fileId }: { fileId: Id<"libraryFiles"> }) {
  const comments = useQuery(api.library.comments.list, { fileId });
  const add = useMutation(api.library.comments.add);
  const [body, setBody] = useState("");

  // Group children by parent id for tree assembly.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, LibraryComment[]>();
    for (const c of comments ?? []) {
      const key = c.parentCommentId ?? "root";
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [comments]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBody("");
    await add({ fileId, body: trimmed });
  }

  const roots = childrenByParent.get("root") ?? [];

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a comment…"
          className="w-full rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--c-accent)]"
        />
        <div className="mt-1 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-[var(--c-accent)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Comment
          </button>
        </div>
      </form>

      {comments === undefined ? (
        <p className="text-sm text-[var(--c-text-muted)]">Loading…</p>
      ) : roots.length === 0 ? (
        <p className="text-sm text-[var(--c-text-muted)]">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {roots.map((c) => (
            <CommentNode
              key={c._id}
              comment={c}
              fileId={fileId}
              childrenByParent={childrenByParent}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentNode({
  comment,
  fileId,
  childrenByParent,
}: {
  comment: LibraryComment;
  fileId: Id<"libraryFiles">;
  childrenByParent: Map<string, LibraryComment[]>;
}) {
  const add = useMutation(api.library.comments.add);
  const remove = useMutation(api.library.comments.remove);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const replies = childrenByParent.get(comment._id) ?? [];
  const deleted = comment.deletedAt !== undefined;

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    setReplyBody("");
    setReplyOpen(false);
    await add({ fileId, parentCommentId: comment._id, body: trimmed });
  }

  return (
    <li className="border-l-2 border-[var(--c-border-light)] pl-3">
      <div className="text-sm">
        {deleted ? (
          <span className="italic text-[var(--c-text-muted)]">
            [comment deleted]
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{comment.body}</span>
        )}
      </div>
      {!deleted && (
        <div className="mt-1 flex gap-3 text-xs text-[var(--c-text-muted)]">
          <button
            type="button"
            onClick={() => setReplyOpen((o) => !o)}
            className="hover:text-[var(--c-text)]"
          >
            Reply
          </button>
          <button
            type="button"
            onClick={() => remove({ commentId: comment._id })}
            className="hover:text-[var(--c-text)]"
          >
            Delete
          </button>
        </div>
      )}

      {replyOpen && (
        <form onSubmit={handleReply} className="mt-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Reply…"
            className="w-full rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--c-accent)]"
          />
          <div className="mt-1 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-[var(--c-accent)] px-3 py-1 text-xs font-medium text-white"
            >
              Reply
            </button>
          </div>
        </form>
      )}

      {replies.length > 0 && (
        <ul className="mt-3 space-y-3">
          {replies.map((r) => (
            <CommentNode
              key={r._id}
              comment={r}
              fileId={fileId}
              childrenByParent={childrenByParent}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
