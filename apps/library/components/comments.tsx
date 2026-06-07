"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
import { inputCls, inputStyle } from "@/components/ui";
import { FONT } from "@/lib/theme";
import type { LibraryComment } from "@/lib/types";

/** Threaded comments for a file. The reply tree is built client-side. */
export function Comments({ fileId }: { fileId: Id<"libraryFiles"> }) {
  const comments = useQuery(api.library.comments.list, { fileId });
  const add = useMutation(api.library.comments.add);
  const [body, setBody] = useState("");

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
  const total = comments?.filter((c) => c.deletedAt === undefined).length ?? 0;

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a comment…"
          className={inputCls}
          style={inputStyle}
        />
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-[0.15em] text-[var(--c-text-muted)]"
            style={{ fontFamily: FONT.mono }}
          >
            {total} {total === 1 ? "comment" : "comments"}
          </span>
          <button
            type="submit"
            className="border border-[var(--c-accent)] bg-[var(--c-accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
            style={{ fontFamily: FONT.mono }}
          >
            Post
          </button>
        </div>
      </form>

      {comments === undefined ? (
        <p
          className="text-[12px] text-[var(--c-text-muted)]"
          style={{ fontFamily: FONT.mono }}
        >
          Loading…
        </p>
      ) : roots.length === 0 ? (
        <p
          className="text-[12px] text-[var(--c-text-muted)]"
          style={{ fontFamily: FONT.mono }}
        >
          No comments yet — start the thread.
        </p>
      ) : (
        <ul className="space-y-4">
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
    <li className="border-l-2 border-[var(--c-border-light)] pl-4">
      <div className="text-[14px] leading-relaxed text-[var(--c-text)]">
        {deleted ? (
          <span
            className="text-[12px] italic text-[var(--c-text-muted)]"
            style={{ fontFamily: FONT.mono }}
          >
            [comment deleted]
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{comment.body}</span>
        )}
      </div>
      {!deleted && (
        <div
          className="mt-1.5 flex gap-4 text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]"
          style={{ fontFamily: FONT.mono }}
        >
          <button
            type="button"
            onClick={() => setReplyOpen((o) => !o)}
            className="transition-colors hover:text-[var(--c-accent)]"
          >
            Reply
          </button>
          <button
            type="button"
            onClick={() => remove({ commentId: comment._id })}
            className="transition-colors hover:text-red-500"
          >
            Delete
          </button>
        </div>
      )}

      {replyOpen && (
        <form onSubmit={handleReply} className="mt-3 space-y-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Reply…"
            className={inputCls}
            style={inputStyle}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="border border-[var(--c-accent)] bg-[var(--c-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
              style={{ fontFamily: FONT.mono }}
            >
              Reply
            </button>
          </div>
        </form>
      )}

      {replies.length > 0 && (
        <ul className="mt-4 space-y-4">
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
