import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "../_generated/server";
import { components, internal } from "../_generated/api";
import {
  createThread as agentCreateThread,
  saveMessage,
  updateThreadMetadata,
} from "@convex-dev/agent";
import { SYSTEM_PROMPT_VERSION } from "@wikipefia/chat/tools";

/**
 * Public queries / mutations for managing threads (CRUD + cancellation).
 *
 * The actual thread storage lives inside @convex-dev/agent's component;
 * we layer `threadMeta` for app-specific fields and call into the agent
 * action for generation.
 *
 * Identity: in v1 there's no auth. Each call accepts a `userId` which is
 * an anonymous session id from the client (localStorage). It scopes
 * threads to the user's browser/device.
 */

const DEFAULT_TITLE = "New conversation";

// ── Public queries ────────────────────────────────────────

export const listMyThreads = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("threadMeta")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return rows
      .filter((r) => !r.deletedAt)
      .map((r) => ({
        _id: r._id,
        threadId: r.threadId,
        title: r.title,
        status: r.status,
        modelId: r.modelId,
        systemPromptVersion: r.systemPromptVersion,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
  },
});

export const getThread = query({
  args: { threadId: v.string(), userId: v.string() },
  handler: async (ctx, { threadId, userId }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row || row.userId !== userId || row.deletedAt) return null;
    return {
      _id: row._id,
      threadId: row.threadId,
      title: row.title,
      status: row.status,
      modelId: row.modelId,
      systemPromptVersion: row.systemPromptVersion,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
});

// ── Public mutations ──────────────────────────────────────

export const createThread = mutation({
  args: {
    userId: v.string(),
    initialMessage: v.string(),
    attachments: v.array(
      v.object({
        storageId: v.string(),
        name: v.string(),
        mimeType: v.string(),
        size: v.number(),
      }),
    ),
    modelId: v.string(),
  },
  handler: async (ctx, { userId, initialMessage, attachments, modelId }) => {
    const title = deriveTitle(initialMessage);

    // Create thread in the agent component
    const threadId = await agentCreateThread(ctx, components.agent, {
      userId,
      title,
    });

    // App-side metadata. generationId starts at 1 so the kicked-off runAgent
    // can identify itself (any later regenerate will bump to 2+).
    const now = Date.now();
    await ctx.db.insert("threadMeta", {
      threadId,
      userId,
      title,
      status: "generating",
      modelId,
      systemPromptVersion: SYSTEM_PROMPT_VERSION,
      cancelRequested: false,
      generationId: 1,
      unlockedWidgets: [],
      createdAt: now,
      updatedAt: now,
    });

    // Save the user's first message + attachments. AI SDK file/image parts
    // need actual data — either a fetchable URL or base64. We use Convex
    // storage URLs (public, signed). Filename/size go into providerOptions
    // so the UI can render them.
    const content = await buildUserContent(ctx, initialMessage, attachments);
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: { role: "user", content } as any,
    });

    // Kick off main agent generation AND title generation in parallel.
    // Title gen uses just the first message + a cheap model, doesn't need
    // to wait for the assistant response.
    await ctx.scheduler.runAfter(0, internal.chat.agent_action.runAgent, {
      threadId,
      promptMessageId: messageId,
      generationId: 1,
    });
    await ctx.scheduler.runAfter(0, internal.chat.agent_action.generateTitle, {
      threadId,
      firstUserMessage: initialMessage,
    });

    return { threadId };
  },
});

export const deleteThread = mutation({
  args: { userId: v.string(), threadId: v.string() },
  handler: async (ctx, { userId, threadId }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row || row.userId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(row._id, { deletedAt: Date.now() });
  },
});

export const renameThread = mutation({
  args: { userId: v.string(), threadId: v.string(), title: v.string() },
  handler: async (ctx, { userId, threadId, title }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row || row.userId !== userId) throw new Error("Forbidden");
    const newTitle = title.slice(0, 200);
    await ctx.db.patch(row._id, { title: newTitle, updatedAt: Date.now() });
    await updateThreadMetadata(ctx, components.agent, {
      threadId,
      patch: { title: newTitle },
    });
  },
});

export const setModel = mutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, { userId, threadId, modelId }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row || row.userId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(row._id, { modelId, updatedAt: Date.now() });
  },
});

export const cancelGeneration = mutation({
  args: { userId: v.string(), threadId: v.string() },
  handler: async (ctx, { userId, threadId }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row || row.userId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(row._id, {
      cancelRequested: true,
      updatedAt: Date.now(),
    });
  },
});

// ── Internal helpers used by the agent action ───────────

export const setStatus = internalMutation({
  args: {
    threadId: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("awaiting_user"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, { threadId, status }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row) return;
    await ctx.db.patch(row._id, {
      status,
      updatedAt: Date.now(),
      cancelRequested: status === "generating" ? row.cancelRequested : false,
    });
  },
});

export const isCancelRequested = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    return row?.cancelRequested ?? false;
  },
});

/**
 * Read the bare-minimum fields the runAgent poller needs to decide whether
 * to abort: cancelRequested + generationId + deletedAt. Returns null when
 * the thread is missing entirely (stops the agent from running into a
 * deleted thread).
 */
export const getRunStateForPolling = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row) return null;
    return {
      cancelRequested: row.cancelRequested ?? false,
      generationId: row.generationId,
      deletedAt: row.deletedAt,
    };
  },
});

export const getMeta = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
  },
});

export const unlockWidget = internalMutation({
  args: { threadId: v.string(), widgetName: v.string() },
  handler: async (ctx, { threadId, widgetName }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row) return;
    if (row.unlockedWidgets.includes(widgetName)) return;
    await ctx.db.patch(row._id, {
      unlockedWidgets: [...row.unlockedWidgets, widgetName],
      updatedAt: Date.now(),
    });
  },
});

export const getUnlockedWidgets = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    return row?.unlockedWidgets ?? [];
  },
});

export const updateTitle = internalMutation({
  args: {
    threadId: v.string(),
    title: v.string(),
    /** When true, marks titleAutoGenerated so we don't re-generate later. */
    auto: v.optional(v.boolean()),
  },
  handler: async (ctx, { threadId, title, auto }) => {
    const row = await ctx.db
      .query("threadMeta")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!row) return;
    const trimmed = title.slice(0, 200);
    await ctx.db.patch(row._id, {
      title: trimmed,
      updatedAt: Date.now(),
      ...(auto ? { titleAutoGenerated: true } : {}),
    });
    await updateThreadMetadata(ctx, components.agent, {
      threadId,
      patch: { title: trimmed },
    });
  },
});

// ── Helpers ────────────────────────────────────────────────

/**
 * Convert the user's text + attachments into AI SDK message content parts.
 * For each attachment we resolve the Convex storageId to a public URL via
 * ctx.storage.getUrl, then emit either an `image` or `file` part depending
 * on mimeType. Filename and size are stashed in providerOptions so the UI
 * can render them on read-back.
 */
type AttachmentInput = {
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildUserContent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  text: string,
  attachments: AttachmentInput[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [{ type: "text", text }];
  for (const a of attachments) {
    const url = await ctx.storage.getUrl(a.storageId);
    if (!url) {
      throw new Error(`File not found in storage: ${a.storageId}`);
    }
    const meta = {
      wikipefia: {
        storageId: a.storageId,
        name: a.name,
        size: a.size,
      },
    };
    if (a.mimeType.startsWith("image/")) {
      content.push({
        type: "image",
        image: url,
        mediaType: a.mimeType,
        providerOptions: meta,
      });
    } else {
      content.push({
        type: "file",
        data: url,
        mediaType: a.mimeType,
        filename: a.name,
        providerOptions: meta,
      });
    }
  }
  return content;
}

export { buildUserContent };

// ── Title derivation helper ───────────────────────────────

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/[#*_`>]/g, "");
  if (trimmed.length === 0) return DEFAULT_TITLE;
  if (trimmed.length <= 50) return trimmed;
  const cut = trimmed.slice(0, 50);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "…";
}
