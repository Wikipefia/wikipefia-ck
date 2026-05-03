import { tool } from "ai";
import { z } from "zod";
import {
  componentRegistry,
  type ComponentEntry,
} from "@wikipefia/mdx-renderer/registry";
import { zodObjectFromProps } from "./zod-from-contract";
import {
  COMPOSITE_DESCRIPTIONS,
  COMPOSITE_SCHEMAS,
  COMPOSITE_WIDGET_NAMES,
} from "./composite-flatten";

/**
 * One widget tool: when the model calls it, the tool execute returns
 * a structured payload that the client renders as the corresponding
 * React widget. The execute is synchronous and side-effect-free at the
 * package layer — the agent's host can wrap it with `createTool` from
 * @convex-dev/agent if it needs ctx.
 */

export interface BuildToolsOptions {
  /** Reserved for future per-app filtering (e.g. studio-only widgets). */
  exclude?: string[];
}

/**
 * Build a Vercel AI SDK tool for a SIMPLE widget (one component, no children
 * tree). Args are the widget's props plus a `content` markdown field if the
 * widget requires children.
 */
function buildSimpleWidgetTool(name: string, entry: ComponentEntry) {
  const propsObject = zodObjectFromProps(entry.props);
  // Always include `content` field if children are required, since the model
  // needs a way to provide the body text.
  const schema = entry.childrenRequired
    ? propsObject.extend({
        content: z
          .string()
          .describe("Markdown content displayed inside the widget."),
      })
    : propsObject;

  const description = entry.catalog?.description ?? name;

  return tool({
    description,
    inputSchema: schema,
    // The host agent's createTool wrapper overrides this for Quiz etc.
    // For non-interactive widgets, returning a plain payload is fine — the
    // client renders the widget from the call args directly.
    execute: async (args: Record<string, unknown>) => ({
      widgetName: name,
      props: args,
    }),
  });
}

/**
 * Build a tool for a COMPOSITE widget (Quiz, Tabs, etc.) using the flat
 * schema from composite-flatten. Returns the same { widgetName, props }
 * payload shape; the renderer expands `props` into the nested JSX tree.
 */
function buildCompositeWidgetTool(name: string) {
  const schema = COMPOSITE_SCHEMAS[name];
  const description = COMPOSITE_DESCRIPTIONS[name] ?? name;
  if (!schema) throw new Error(`No composite schema for ${name}`);

  return tool({
    description,
    inputSchema: schema,
    execute: async (args: unknown) => ({ widgetName: name, props: args }),
  });
}

/**
 * Build the full set of widget tools from the mdx-renderer registry.
 *
 * Filters:
 *   - Only entries with `catalog` metadata (skip parent-only entries like Tab, Question, etc.)
 *   - Composite widgets get the special flat schema from composite-flatten.ts
 *   - The rest become simple per-prop tools.
 *
 * The host (Convex agent action) decides which subset to actually register
 * AND which subset is in `activeTools` per step.
 */
export function buildWidgetTools(opts: BuildToolsOptions = {}): Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ReturnType<typeof tool<any, any>>
> {
  const exclude = new Set(opts.exclude ?? []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, ReturnType<typeof tool<any, any>>> = {};

  for (const [name, entry] of Object.entries(componentRegistry)) {
    if (exclude.has(name)) continue;
    if (!entry.catalog) continue; // Skip parent-only entries
    if (entry.parent) continue; // Defensive: skip child entries

    if (COMPOSITE_WIDGET_NAMES.has(name)) {
      tools[name] = buildCompositeWidgetTool(name);
    } else {
      tools[name] = buildSimpleWidgetTool(name, entry);
    }
  }

  return tools;
}

/**
 * List of all top-level insertable widget names from the registry.
 * Used by the system prompt and prepareStep activeTools.
 */
export function getAllWidgetToolNames(): string[] {
  return Object.entries(componentRegistry)
    .filter(([, entry]) => entry.catalog && !entry.parent)
    .map(([name]) => name);
}
