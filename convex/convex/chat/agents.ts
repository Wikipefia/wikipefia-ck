"use node";

import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import {
  buildWidgetTools,
  WIDGET_DOCS,
  SYSTEM_PROMPT_V1,
} from "@wikipefia/chat/tools";
import { components, internal } from "../_generated/api";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Quiz tool — special-cased to require user approval. Generation pauses
 * when this tool is called; the user submits answers via a mutation that
 * sends an approval response, which schedules the next agent step.
 */
const quizTool = createTool({
  description:
    "Multiple-choice quiz. INTERACTIVE: the user will answer; you'll then receive their answers as a tool result and must explain whether each was correct.",
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          text: z.string(),
          options: z
            .array(
              z.object({
                value: z.string(),
                correct: z.boolean(),
                explanation: z.string().optional(),
              }),
            )
            .min(2)
            .max(6),
        }),
      )
      .min(1),
  }),
  needsApproval: () => true,
  execute: async () => {
    // Only runs after the user has submitted answers via the approval flow.
    return { acknowledged: true };
  },
});

/**
 * Lookup tool: returns full schema/guidance/examples for one widget AND
 * unlocks it for subsequent agent steps. The agent action's `prepareStep`
 * re-reads `unlockedWidgets` from the thread before each LLM call, so the
 * widget tool becomes callable in the next step within the same streamText.
 *
 * Robustness:
 *   - Case-insensitive name match (handles e.g. "comparison" → "Comparison").
 *   - Strips whitespace, surrounding quotes, and HTML-tag-like syntax
 *     ("<Tabs>" → "Tabs") that some smaller models emit.
 *   - On unknown name, returns a structured error WITH the full valid list,
 *     so the model can self-correct on the next step.
 */
const VALID_WIDGET_NAMES = Object.keys(WIDGET_DOCS);
const WIDGET_NAME_BY_LOWER = Object.fromEntries(
  VALID_WIDGET_NAMES.map((n) => [n.toLowerCase(), n]),
);

function normalizeWidgetName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw
    .trim()
    .replace(/^[<\"'`]+|[>\"'`]+$/g, "")
    .trim();
  if (trimmed.length === 0) return null;
  // Exact match first (preserves case if model got it right).
  if (WIDGET_DOCS[trimmed]) return trimmed;
  // Case-insensitive fallback.
  const canonical = WIDGET_NAME_BY_LOWER[trimmed.toLowerCase()];
  return canonical ?? null;
}

const lookupWidgetDocs = createTool({
  description:
    "Required pre-step before using ANY widget. Returns the widget's full input schema, guidance, and a copy-pastable usage example. After calling this, the widget tool of that name becomes available to call on your next step. Pass the widget name EXACTLY as listed in the system prompt.",
  inputSchema: z.object({
    widgetName: z
      .string()
      .describe(
        "Exact widget name, e.g. 'Comparison', 'Quiz', 'Graph'. " +
          "Case-sensitive but the tool tolerates case mistakes.",
      ),
  }),
  execute: async (ctx, { widgetName }) => {
    const canonical = normalizeWidgetName(widgetName);
    if (!canonical) {
      return {
        ok: false,
        error: `Unknown widget "${widgetName}". Valid names: ${VALID_WIDGET_NAMES.join(", ")}.`,
        validWidgetNames: VALID_WIDGET_NAMES,
      };
    }
    const docs = WIDGET_DOCS[canonical];
    if (ctx.threadId) {
      try {
        await ctx.runMutation(internal.chat.threads.unlockWidget, {
          threadId: ctx.threadId,
          widgetName: canonical,
        });
      } catch (err) {
        // Non-fatal — the agent can still emit the widget call; if
        // activeTools was misconfigured the next step will surface it.
        console.warn("unlockWidget failed", err);
      }
    }
    return {
      ok: true,
      widgetName: canonical,
      description: docs.description,
      guidance: docs.guidance,
      examples: docs.examples,
      next: `On your NEXT step, call the tool named "${canonical}" with args matching the example above.`,
    };
  },
});

/**
 * Build the full tool registry. We register ALL widget tools but the agent
 * only sees a subset (CORE_TIER + unlocked + lookupWidgetDocs) per step
 * via prepareStep passed to streamText (see agent_action.ts).
 */
export const ALL_TOOLS = {
  ...buildWidgetTools(),
  Quiz: quizTool,
  lookupWidgetDocs,
};

/**
 * Default Agent instance. The model is overridable per-thread via
 * getAgentForModel below.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tutorAgent: any = new Agent(components.agent, {
  name: "Wikipefia Tutor",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  languageModel: openrouter("anthropic/claude-sonnet-4.5") as any,
  instructions: SYSTEM_PROMPT_V1,
  tools: ALL_TOOLS,
  stopWhen: stepCountIs(8),
});

/**
 * Build a per-thread agent bound to a specific OpenRouter model id.
 * Each thread locks its model at creation; we materialize the right Agent
 * here so streamText runs against the chosen LLM.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAgentForModel(modelId: string): any {
  return new Agent(components.agent, {
    name: "Wikipefia Tutor",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    languageModel: openrouter(modelId) as any,
    instructions: SYSTEM_PROMPT_V1,
    tools: ALL_TOOLS,
    stopWhen: stepCountIs(8),
  });
}
