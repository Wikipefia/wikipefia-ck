"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { listMessages as agentListMessages } from "@convex-dev/agent";
import { applyDefaults, getMode } from "@wikipefia/chat/modes";
import { widgetCatalogLines } from "@wikipefia/chat/tools";

/**
 * Debug-export action. Returns the entire thread serialized to one of:
 *   - json     — full structured dump (messages, parts, metadata)
 *   - markdown — human-readable transcript with role headings
 *   - replay   — { messages, model, system } shape for re-feeding to generateText
 */

interface AnyMessage {
  _id?: string;
  _creationTime?: number;
  threadId?: string;
  role?: string;
  text?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message?: any;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usage?: any;
}

export const exportThread = action({
  args: {
    userId: v.string(),
    threadId: v.string(),
    format: v.union(
      v.literal("json"),
      v.literal("markdown"),
      v.literal("replay"),
    ),
  },
  handler: async (
    ctx,
    { userId, threadId, format },
  ): Promise<{ content: string; mime: string }> => {
    const meta = await ctx.runQuery(internal.chat.threads.getMeta, {
      threadId,
    });
    if (!meta || meta.userId !== userId) throw new Error("Forbidden");

    const allMessages: AnyMessage[] = [];
    let cursor: string | null = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await agentListMessages(ctx, components.agent, {
        threadId,
        paginationOpts: { numItems: 200, cursor },
      });
      allMessages.push(...(page.page as AnyMessage[]));
      if (page.isDone || !page.continueCursor) break;
      cursor = page.continueCursor;
    }
    allMessages.sort(
      (a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0),
    );

    // Resolve the full system prompt that the agent used for this thread.
    // For older threads (before the modes feature) we fall back to the
    // default mode's system prompt, which is the same as what the agent
    // used at the time. The catalog of widgets is included via the same
    // helper the agent calls at runtime, so the resulting string matches
    // exactly what the LLM saw.
    const resolvedMode = getMode(meta.mode);
    const resolvedModeSettings = applyDefaults(
      resolvedMode,
      (meta.modeSettings ?? null) as Record<string, unknown> | null,
    );
    const systemPromptText = resolvedMode.buildSystemPrompt({
      settings: resolvedModeSettings,
      widgetCatalog: widgetCatalogLines(),
    });

    if (format === "json") {
      return {
        content: JSON.stringify(
          {
            meta: {
              threadId: meta.threadId,
              title: meta.title,
              modelId: meta.modelId,
              systemPromptVersion: meta.systemPromptVersion,
              mode: meta.mode,
              modeSettings: meta.modeSettings,
              modePromptVersion: meta.modePromptVersion,
              resolvedModeSettings,
              systemPrompt: systemPromptText,
              createdAt: meta.createdAt,
              updatedAt: meta.updatedAt,
              status: meta.status,
            },
            messages: allMessages,
          },
          null,
          2,
        ),
        mime: "application/json",
      };
    }

    if (format === "replay") {
      const messages = allMessages.map((m) => ({
        role: m.role ?? m.message?.role,
        content: m.message?.content ?? m.parts ?? m.text,
      }));
      return {
        content: JSON.stringify(
          {
            model: meta.modelId,
            systemPromptVersion: meta.systemPromptVersion,
            mode: meta.mode,
            modeSettings: resolvedModeSettings,
            modePromptVersion: meta.modePromptVersion,
            // Full system prompt the agent used at thread-creation time.
            // Replays should feed this verbatim to the model.
            system: systemPromptText,
            messages,
          },
          null,
          2,
        ),
        mime: "application/json",
      };
    }

    // Markdown
    const lines: string[] = [];
    lines.push(`# ${meta.title}`);
    lines.push("");
    lines.push(`- **Thread ID:** \`${meta.threadId}\``);
    lines.push(`- **Model:** \`${meta.modelId}\``);
    lines.push(`- **System prompt version:** \`${meta.systemPromptVersion}\``);
    if (meta.mode) {
      lines.push(`- **Mode:** \`${meta.mode}\` (prompt v\`${meta.modePromptVersion ?? "?"}\`)`);
      if (meta.modeSettings) {
        lines.push(
          `- **Mode settings:** \`${JSON.stringify(resolvedModeSettings)}\``,
        );
      }
    }
    lines.push(`- **Created:** ${new Date(meta.createdAt).toISOString()}`);
    lines.push("");
    lines.push("---");
    lines.push("");
    // System prompt — full resolved text (mode + settings applied + widget
    // catalog). Quoted in a fenced block so markdown viewers don't try to
    // re-render the embedded markdown formatting.
    lines.push("## System prompt");
    lines.push("");
    lines.push("```");
    lines.push(systemPromptText);
    lines.push("```");
    lines.push("");
    lines.push("---");
    lines.push("");

    for (const m of allMessages) {
      const role = (m.role ?? m.message?.role ?? "unknown").toUpperCase();
      const tsLine = m._creationTime
        ? ` _(${new Date(m._creationTime).toISOString()})_`
        : "";
      lines.push(`### ${role}${tsLine}`);
      lines.push("");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = Array.isArray(m.parts)
        ? m.parts
        : Array.isArray(m.message?.content)
          ? m.message.content
          : m.text
            ? [{ type: "text", text: m.text }]
            : [];
      for (const p of parts) {
        const t = p.type as string;
        if (t === "text") {
          lines.push(p.text ?? "");
        } else if (t === "reasoning") {
          lines.push("> _reasoning_");
          lines.push(`> ${(p.text ?? "").split("\n").join("\n> ")}`);
        } else if (t === "tool-call" || (t && t.startsWith("tool-") && t !== "tool-result")) {
          lines.push(`**[TOOL CALL ${p.toolName ?? t.slice(5)}]**`);
          lines.push("```json");
          lines.push(JSON.stringify(p.input ?? p.args ?? {}, null, 2));
          lines.push("```");
        } else if (t === "tool-result") {
          lines.push(`**[TOOL RESULT ${p.toolName ?? ""}]**`);
          lines.push("```json");
          lines.push(JSON.stringify(p.result ?? p.output ?? {}, null, 2));
          lines.push("```");
        } else if (t === "file" || t === "image") {
          const size = p.size
            ? ` (${(p.size / 1024).toFixed(1)} KB)`
            : "";
          lines.push(`**[FILE: ${p.name ?? p.filename ?? "file"}${size}]**`);
        }
      }
      lines.push("");
    }

    return {
      content: lines.join("\n"),
      mime: "text/markdown",
    };
  },
});
