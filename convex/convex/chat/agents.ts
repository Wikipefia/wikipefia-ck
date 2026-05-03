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
 * Lookup tool: returns full docs for a widget AND unlocks it for subsequent
 * agent steps via prepareStep + activeTools.
 */
const lookupWidgetDocs = createTool({
  description:
    "Fetch detailed schema, guidance, and usage examples for a widget by name. Call this BEFORE using a widget that's not in the core tier.",
  inputSchema: z.object({
    widgetName: z.string().describe("Exact widget name, e.g. 'Comparison'."),
  }),
  execute: async (ctx, { widgetName }) => {
    const docs = WIDGET_DOCS[widgetName];
    if (!docs) {
      return {
        error: `Unknown widget: ${widgetName}. Available: ${Object.keys(WIDGET_DOCS).join(", ")}`,
      };
    }
    if (ctx.threadId) {
      await ctx.runMutation(internal.chat.threads.unlockWidget, {
        threadId: ctx.threadId,
        widgetName,
      });
    }
    return {
      widgetName,
      description: docs.description,
      guidance: docs.guidance,
      examples: docs.examples,
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
