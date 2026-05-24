"use node";

import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import {
  buildWidgetTools,
  WIDGET_DOCS,
  widgetCatalogLines,
} from "@wikipefia/chat/tools";
import { applyDefaults, getMode } from "@wikipefia/chat/modes";
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
 * AskUserQuestion — single comprehension question with three variants
 * driven by a `type` discriminator:
 *   - multiple_choice: provide `options` (one with `correct: true`)
 *   - numeric: provide `expectedValue` (and optional `tolerance` / `unit`)
 *   - free_text: provide `expectedKeyPoints` (and optional `minWords`)
 *
 * INTERACTIVE — pauses generation; user submits via the same approval flow
 * Quiz uses (`submitToolResponse`). On its next step the model receives the
 * user's payload as a tool-result and is responsible for evaluating it.
 *
 * SCHEMA SHAPE NOTE: we flatten the schema into a single z.object instead
 * of using z.discriminatedUnion. Azure / OpenAI strict-mode adapters
 * require `type: "object"` at the JSON-Schema root and don't accept the
 * `anyOf` form that discriminated unions produce. The flat shape achieves
 * the same intent — the model fills only the fields relevant to its
 * chosen `type` — at the cost of leaving validation of "right fields for
 * right type" to the prompt rather than the schema. Dead-letter validation
 * happens in the runtime UI, which already handles missing fields
 * gracefully.
 */
const askUserQuestionTool = createTool({
  description: [
    "INTERACTIVE single comprehension question. Pauses generation; the user",
    "answers; on your next step you'll receive their answer as a tool result",
    "and you MUST evaluate it (correct? misconception?). Use ONE question at",
    "a time.",
    "",
    "Pick the variant via the `type` field, then fill the fields relevant",
    "to that variant. Leave irrelevant fields out.",
    "",
    "- type=\"multiple_choice\": fill `options` (2-6 items, exactly one",
    "  marked `correct: true`).",
    "- type=\"numeric\": fill `expectedValue` (and optional `tolerance` and",
    "  `unit`).",
    "- type=\"free_text\": fill `expectedKeyPoints` (1+ short phrases that",
    "  should be present semantically) and optional `minWords`.",
    "",
    "CRITICAL: `context` is a SHORT problem-setup for the CURRENT question",
    "(1-2 sentences max — e.g. 'Let X be the number of defective items').",
    "It is NOT for feedback on a previous answer, NOT for re-explaining",
    "what you just taught, and NOT for transition prose like 'let's check",
    "your understanding'. Feedback on prior answers MUST be written as",
    "ordinary prose BEFORE this tool call, not stuffed into `context`.",
  ].join("\n"),
  inputSchema: z.object({
    type: z
      .enum(["multiple_choice", "numeric", "free_text"])
      .describe(
        "Question variant. Determines which other fields you must fill.",
      ),
    prompt: z
      .string()
      .min(2)
      .describe("Question text; markdown + $LaTeX$ supported."),
    context: z
      .string()
      .optional()
      .describe(
        "Optional SHORT problem-setup for THIS question (1-2 sentences, e.g. 'Let X be the number of defective items in 3'). DO NOT use for feedback on a prior answer or for re-explaining the chunk — write that as prose before the tool call.",
      ),
    // multiple_choice fields
    options: z
      .array(
        z.object({
          value: z.string(),
          correct: z.boolean(),
          explanation: z.string().optional(),
        }),
      )
      .min(2)
      .max(6)
      .optional()
      .describe(
        "REQUIRED when type=\"multiple_choice\". 2-6 options, exactly one with `correct: true`.",
      ),
    // numeric fields
    expectedValue: z
      .number()
      .optional()
      .describe(
        "REQUIRED when type=\"numeric\". The expected numeric answer.",
      ),
    tolerance: z
      .number()
      .min(0)
      .optional()
      .describe(
        "Optional absolute tolerance for numeric answers (e.g. 0.05 accepts ±0.05). Defaults to 0 (exact match).",
      ),
    unit: z
      .string()
      .optional()
      .describe(
        "Optional unit shown next to the input for numeric questions (e.g. 'м/с', 'kg').",
      ),
    // free_text fields
    expectedKeyPoints: z
      .array(z.string())
      .min(1)
      .optional()
      .describe(
        "REQUIRED when type=\"free_text\". Short phrases that should appear (semantically) in a correct answer. Use to evaluate generously — partial credit is OK.",
      ),
    minWords: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        "Optional minimum word count for free_text answers, to nudge users to write a real explanation.",
      ),
  }),
  needsApproval: () => true,
  execute: async () => ({ acknowledged: true }),
});

/**
 * PlanTopics — tutor-mode Phase 0 planning tool. Required FIRST step in
 * any tutor session. The model analyzes the user's input (uploaded files,
 * stated topic, pasted material) and breaks it into an ordered list of
 * small but detailed sub-topics.
 *
 * The list is shown in the right side panel. The user can edit titles /
 * descriptions / prompts, delete topics, reorder them, add new ones, OR
 * request a re-plan — all live, while the agent is paused on this tool's
 * approval.
 *
 * When the user clicks "Continue" in the chat-side widget, the approval
 * is resolved with `{ action: "start" }`. The next runAgent transitions
 * to teaching mode using the (possibly edited) plan.
 *
 * Replan flow: user clicks "Replan" in the side panel; the UI resolves
 * this approval with `{ action: "replan", instructions?: string }` →
 * model rebuilds the plan from scratch on the next step.
 */
const planTopicsTool = createTool({
  description:
    "REQUIRED FIRST STEP for tutor mode. Analyze the user's input (uploaded files, stated topic, pasted material) and break it into an ordered list of small but detailed sub-topics. After emitting this, generation pauses; the user reviews/edits the plan in a side panel, then clicks 'Continue' to start teaching. Do NOT explain content yet — the actual teaching happens topic-by-topic AFTER the user approves the plan.",
  inputSchema: z.object({
    topics: z
      .array(
        z.object({
          title: z
            .string()
            .min(2)
            .describe(
              "Short title (3–7 words) — what the user sees in the side-panel topic list. e.g. 'Определение случайной величины'.",
            ),
          description: z
            .string()
            .min(10)
            .describe(
              "One sentence describing what this topic covers, in the user's language. e.g. 'Определение случайной величины и её отличие от обычной переменной.'",
            ),
          prompt: z
            .string()
            .min(20)
            .describe(
              "Detailed prompt for YOURSELF — what to explain, what examples to give, what depth, what widgets to consider. The user will see this as 'editable instructions for the tutor'. You'll receive it back when starting Phase B for this topic.",
            ),
        }),
      )
      .min(1)
      .max(20)
      .describe(
        "Ordered list of sub-topics. 5-12 topics is typical for a single document; for a single concept request 1-3 may be enough. Each topic = ONE self-contained learning chunk.",
      ),
  }),
  needsApproval: () => true,
  execute: async () => ({ acknowledged: true }),
});

/**
 * NextTopicButton — interactive "proceed to next topic" affordance. Used by
 * tutor mode when `autoAdvance=off` after the user has demonstrated
 * understanding of the current chunk. Pauses generation until the user
 * either clicks "continue" or asks a clarifying question.
 *
 * The user-submitted payload is one of:
 *   - { action: "continue" }
 *   - { action: "ask", question: string }
 *
 * The model is instructed (via the auto-advance-off prompt fragment) on
 * how to handle each branch.
 */
const nextTopicButtonTool = createTool({
  description:
    "INTERACTIVE 'proceed to next topic' affordance for tutor mode (autoAdvance=off). Pauses generation. The user clicks either 'continue' or 'I have a question'. You'll receive { action: 'continue' } or { action: 'ask', question: string } as a tool result. Only emit AFTER the user has demonstrated understanding of the current chunk.",
  inputSchema: z.object({
    currentTopicSummary: z
      .string()
      .min(2)
      .describe(
        "One short sentence summarizing what was just covered, in the user's language. e.g. 'Разобрали определение производной по Ньютону.'",
      ),
    nextTopicHint: z
      .string()
      .min(2)
      .describe(
        "Short label (3–8 words, user's language) previewing what comes next. e.g. 'Геометрический смысл производной'.",
      ),
  }),
  needsApproval: () => true,
  execute: async () => ({ acknowledged: true }),
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
 * only sees a subset (CORE_TIER + unlocked + lookupWidgetDocs + mode
 * whitelist) per step via prepareStep passed to streamText (see
 * agent_action.ts → prepareStep, which consumes mode.allowedTools).
 *
 * Tutor-mode-only tools (AskUserQuestion, NextTopicButton) are registered
 * here too — they're available to ALL agents at construction time but
 * only become callable when the thread's mode whitelists them.
 */
export const ALL_TOOLS = {
  ...buildWidgetTools(),
  Quiz: quizTool,
  AskUserQuestion: askUserQuestionTool,
  NextTopicButton: nextTopicButtonTool,
  PlanTopics: planTopicsTool,
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
 * Build a per-thread agent based on the thread's `meta` snapshot.
 *
 * The agent's `instructions` are resolved by the thread's mode (see
 * `@wikipefia/chat/modes`). Mode + settings + model are all locked at
 * thread creation time and persisted in `threadMeta`, so this factory
 * is deterministic — same `meta` ⇒ same Agent shape.
 *
 * `tools` is the universal `ALL_TOOLS` registry (every tool the app knows
 * about). The mode's `allowedTools` is applied per-step inside
 * `agent_action.ts → prepareStep`, NOT here — AI SDK only respects
 * activeTools per-step, not at Agent construction.
 *
 * `threadState` carries dynamic per-thread state (the topic plan in tutor
 * mode, e.g.) which the mode's `buildSystemPrompt` may use to inject
 * runtime info (current topic, phase, etc.). Rebuilt every runAgent so
 * the prompt is always up-to-date.
 */
export interface AgentMetaShape {
  modelId: string;
  mode?: string;
  modeSettings?: Record<string, unknown> | null;
  // Tutor-mode (and future modes that need it) runtime state. Optional.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topicPlan?: any;
  tutorPhase?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAgentForThread(meta: AgentMetaShape): any {
  const mode = getMode(meta.mode);
  const settings = applyDefaults(mode, meta.modeSettings ?? null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicPlan = Array.isArray(meta.topicPlan) ? (meta.topicPlan as any[]) : undefined;
  const instructions = mode.buildSystemPrompt({
    settings,
    widgetCatalog: widgetCatalogLines(),
    threadState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topicPlan: topicPlan as any,
      tutorPhase: meta.tutorPhase,
    },
  });
  return new Agent(components.agent, {
    name: `Wikipefia Tutor (${mode.id})`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    languageModel: openrouter(meta.modelId) as any,
    instructions,
    tools: ALL_TOOLS,
    stopWhen: stepCountIs(8),
    contextHandler: enrichQuestionBoxResults,
  });
}

/**
 * Default Agent instance — preserved for any callers that don't have a
 * full thread meta (e.g. test scaffolding). Uses default mode.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tutorAgent: any = getAgentForThread({
  modelId: "anthropic/claude-sonnet-4.5",
});
