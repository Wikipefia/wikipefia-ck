import { z } from "zod";

/**
 * Names of composite widgets that have a parent + child structure in the MDX
 * registry. We expose each as a SINGLE tool with a flat schema instead of
 * letting the model emit nested tool calls. The client expands the flat shape
 * back into the React component tree (see WidgetRenderer).
 *
 * This matters for token cost (one schema vs many) and for matching how the
 * model actually thinks about a widget ("a quiz with these questions").
 */
export const COMPOSITE_WIDGET_NAMES = new Set([
  "Quiz",
  "Tabs",
  "Comparison",
  "Timeline",
  "BarChart",
  "StepByStep",
  "Graph",
  "FlowDiagram",
  "CycleDiagram",
  "Diagram",
  "Interactive",
]);

// ── Composite schemas ──────────────────────────────────────────────────

export const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().describe("The question text shown to the user."),
        options: z
          .array(
            z.object({
              value: z.string().describe("The option label shown to the user."),
              correct: z
                .boolean()
                .describe("Whether this option is the correct answer."),
              explanation: z
                .string()
                .optional()
                .describe(
                  "Optional explanation shown when the user picks this option.",
                ),
            }),
          )
          .min(2)
          .max(6)
          .describe("Between 2 and 6 options. EXACTLY ONE must be correct."),
      }),
    )
    .min(1),
});

export const TabsSchema = z.object({
  tabs: z
    .array(
      z.object({
        label: z.string(),
        content: z.string().describe("Markdown content of this tab."),
      }),
    )
    .min(2),
});

export const ComparisonSchema = z.object({
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string(),
        color: z.string().optional(),
        content: z.string().describe("Markdown content of this comparison side."),
      }),
    )
    .min(2)
    .max(4),
});

export const TimelineSchema = z.object({
  title: z.string().optional(),
  events: z
    .array(
      z.object({
        date: z.string(),
        title: z.string(),
        color: z.string().optional(),
        description: z
          .string()
          .optional()
          .describe("Markdown description of the event."),
      }),
    )
    .min(1),
});

export const BarChartSchema = z.object({
  title: z.string().optional(),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  animate: z.boolean().optional(),
  showValues: z.boolean().optional(),
  bars: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        color: z.string().optional(),
      }),
    )
    .min(1),
});

export const StepByStepSchema = z.object({
  title: z.string().optional(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        content: z.string().describe("Markdown body of this step."),
      }),
    )
    .min(1),
});

export const GraphSchema = z.object({
  title: z.string().optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  xMin: z.number().optional(),
  xMax: z.number().optional(),
  yMin: z.number().optional(),
  yMax: z.number().optional(),
  plots: z
    .array(
      z.object({
        expr: z.string().describe("Mathematical expression like 'x^2' or 'sin(x)'."),
        color: z.string().optional(),
        label: z.string().optional(),
        dashed: z.boolean().optional(),
      }),
    )
    .optional(),
  points: z
    .array(
      z.object({
        x: z.string(),
        y: z.string(),
        label: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .optional(),
});

export const FlowDiagramSchema = z.object({
  title: z.string().optional(),
  direction: z.enum(["horizontal", "vertical"]).optional(),
  animate: z.boolean().optional(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        icon: z.string().optional(),
        color: z.string().optional(),
        highlight: z.boolean().optional(),
      }),
    )
    .min(1),
  arrows: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
        color: z.string().optional(),
        animated: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const CycleDiagramSchema = z.object({
  title: z.string().optional(),
  size: z.number().optional(),
  animate: z.boolean().optional(),
  clockwise: z.boolean().optional(),
  nodes: z
    .array(
      z.object({
        label: z.string(),
        color: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .min(2),
});

export const DiagramSchema = z.object({
  title: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  animate: z.boolean().optional(),
  boxes: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
        label: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .optional(),
  circles: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        r: z.number(),
        label: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .optional(),
  arrows: z
    .array(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        label: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .optional(),
  labels: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        text: z.string(),
        bold: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const InteractiveSchema = z.object({
  title: z.string().optional(),
  sliders: z
    .array(
      z.object({
        name: z.string(),
        min: z.number(),
        max: z.number(),
        default: z.number(),
        step: z.number().optional(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  toggles: z
    .array(
      z.object({
        name: z.string(),
        default: z.boolean().optional(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  values: z
    .array(
      z.object({
        label: z.string(),
        expr: z.string(),
        decimals: z.number().optional(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
      }),
    )
    .min(1),
});

export const COMPOSITE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  Quiz: QuizSchema,
  Tabs: TabsSchema,
  Comparison: ComparisonSchema,
  Timeline: TimelineSchema,
  BarChart: BarChartSchema,
  StepByStep: StepByStepSchema,
  Graph: GraphSchema,
  FlowDiagram: FlowDiagramSchema,
  CycleDiagram: CycleDiagramSchema,
  Diagram: DiagramSchema,
  Interactive: InteractiveSchema,
};

export const COMPOSITE_DESCRIPTIONS: Record<string, string> = {
  Quiz:
    "Multiple-choice quiz. INTERACTIVE: the user will answer the questions, and you will then receive their answers as a tool result and must explain whether each was correct.",
  Tabs: "Tabbed content sections. Each tab has a label and markdown content.",
  Comparison:
    "Side-by-side comparison of 2–4 items. Each item has a title and markdown content.",
  Timeline:
    "Chronological timeline of events. Each event has a date, title, and optional description.",
  BarChart: "Bar chart visualizing labeled numeric values.",
  StepByStep: "Numbered step-by-step procedure. Each step has a title and markdown body.",
  Graph:
    "Interactive 2D coordinate graph. Use `plots` for function curves, `points` for individual points.",
  FlowDiagram:
    "Flowchart with named nodes connected by labeled arrows. Use horizontal or vertical direction.",
  CycleDiagram: "Circular cycle diagram with 2+ ordered nodes.",
  Diagram:
    "Free-form diagram with absolute-positioned boxes, circles, arrows, and labels.",
  Interactive:
    "Reactive sandbox with sliders/toggles whose values update computed expressions in real time.",
};
