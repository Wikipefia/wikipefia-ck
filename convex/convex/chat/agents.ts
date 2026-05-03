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
 * QuestionBox tool — placed inline by the model after a discrete subtopic.
 * The user can later click it to ask a follow-up about that subtopic.
 *
 * IMPORTANT design choices:
 *   - NO `needsApproval`: emitting the tool does NOT pause the main stream.
 *     QuestionBoxes are decorative anchors; the user may or may not click.
 *   - The tool's `execute` is a no-op `acknowledge`. The actual side-channel
 *     conversation lives in the `questionBoxPairs` table and is driven
 *     entirely by `chat/questionBox_action.ts`.
 *   - `topic` is what the user sees in the box and what the side-channel
 *     uses to scope the follow-up. Models are instructed in the system
 *     prompt to make it short + specific.
 */
const questionBoxTool = createTool({
  description:
    "Inline 'ask a focused follow-up' affordance. Place AFTER a discrete subtopic in a multi-subtopic answer — gives the user a click-to-ask-about-this-specific-thing button without disturbing the main thread. Use ONE per major subtopic; not after every paragraph and not just at the end of short answers.",
  inputSchema: z.object({
    topic: z
      .string()
      .min(2)
      .describe(
        "Short (3–8 words) description of the subtopic this QuestionBox is anchored to, in the user's language. Shown to the user as the box label and used to scope the follow-up. e.g. 'Dispersion vs standard deviation', 'Производная сложной функции'.",
      ),
  }),
  execute: async () => ({ acknowledged: true }),
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
  QuestionBox: questionBoxTool,
  lookupWidgetDocs,
};

/**
 * `contextHandler` for the main agent.
 *
 * Walks every message about to be sent to the LLM and, for each
 * `tool-result` whose `toolName` is `QuestionBox`, REPLACES the result's
 * output with the live Q&A history pulled from the `questionBoxPairs`
 * table. This way, when the user sends a new top-level message, the main
 * model sees what the user asked inside any QuestionBox they interacted
 * with — and what was answered there — without having to maintain a
 * second copy of that data inside the agent's own message store.
 *
 * Mutating IN-MEMORY only: nothing is persisted back to the agent's
 * message rows. The next call re-derives the enriched context fresh.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enrichQuestionBoxResults = async (ctx: any, args: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMessages = args.allMessages as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched: any[] = [];
  for (const msg of allMessages) {
    if (msg?.role !== "tool" || !Array.isArray(msg.content)) {
      enriched.push(msg);
      continue;
    }
    let touched = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newParts: any[] = [];
    for (const part of msg.content) {
      if (
        part?.type !== "tool-result" ||
        part.toolName !== "QuestionBox"
      ) {
        newParts.push(part);
        continue;
      }
      const pairs = (await ctx.runQuery(
        internal.chat.questionBox.listPairsByToolCall,
        { toolCallId: part.toolCallId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any[];
      if (!pairs || pairs.length === 0) {
        newParts.push(part);
        continue;
      }
      // Surface the sub-conversation. Keeping the original `acknowledged`
      // flag preserves backward signal that the box was emitted; the new
      // `conversation` array is what the model will read.
      newParts.push({
        ...part,
        output: {
          type: "json",
          value: {
            acknowledged: true,
            note:
              "The user opened this QuestionBox and asked the following follow-up(s). Their question(s) and the model's answer(s) are listed below in chronological order. Treat them as additional shared context if relevant to the new turn.",
            conversation: pairs.map((p) => ({
              question: p.question,
              answer: p.answer,
              ...(p.status !== "complete" ? { status: p.status } : {}),
            })),
          },
        },
      });
      touched = true;
    }
    enriched.push(touched ? { ...msg, content: newParts } : msg);
  }
  return enriched;
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
  contextHandler: enrichQuestionBoxResults,
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
    contextHandler: enrichQuestionBoxResults,
  });
}
