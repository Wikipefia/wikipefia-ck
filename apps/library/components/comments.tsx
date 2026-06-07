"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { Button, Textarea } from "@wikipefia/ui";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
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
    // Keep the draft until the server confirms, so a failed post isn't lost.
    try {
      await add({ fileId, body: trimmed });
      setBody("");
    } catch {
      // Leave the text in place for the user to retry.
    }
  }

  const roots = childrenByParent.get("root") ?? [];
  const total = comments?.filter((c) => c.deletedAt === undefined).length ?? 0;

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a comment…"
          aria-label="Add a comment"
        />
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-[0.15em] text-muted"
            style={{ fontFamily: FONT.mono }}
          >
            {total} {total === 1 ? "comment" : "comments"}
          </span>
          <Button type="submit" variant="primary" size="sm">
            Post
          </Button>
        </div>
      </form>

      {comments === undefined ? (
        <p className="text-[12px] text-muted" style={{ fontFamily: FONT.mono }}>
          Loading…
        </p>
      ) : roots.length === 0 ? (
        <p className="text-[12px] text-muted" style={{ fontFamily: FONT.mono }}>
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
    // Keep the draft + form open until the reply is confirmed.
    try {
      await add({ fileId, parentCommentId: comment._id, body: trimmed });
      setReplyBody("");
      setReplyOpen(false);
    } catch {
      // Leave the reply text for the user to retry.
    }
  }

  return (
    <li className="border-l-2 border-line-soft pl-4">
      <div className="text-[14px] leading-relaxed text-fg">
        {deleted ? (
          <span
            className="text-[12px] italic text-muted"
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
          className="mt-1.5 flex gap-4 text-[10px] uppercase tracking-[0.12em] text-muted"
          style={{ fontFamily: FONT.mono }}
        >
          <button
            type="button"
            onClick={() => setReplyOpen((o) => !o)}
            className="transition-colors hover:text-accent"
          >
            Reply
          </button>
          <button
            type="button"
            onClick={() => remove({ commentId: comment._id })}
            className="transition-colors hover:text-danger"
          >
            Delete
          </button>
        </div>
      )}

      {replyOpen && (
        <form onSubmit={handleReply} className="mt-3 space-y-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Reply…"
            aria-label="Reply to comment"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm">
              Reply
            </Button>
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
