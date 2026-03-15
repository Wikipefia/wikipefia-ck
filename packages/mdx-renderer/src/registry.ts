/**
 * Unified component registry — single source of truth for all MDX components.
 *
 * This file contains NO React imports. It defines:
 *   - Prop contracts (types, required/optional, enum values)
 *   - Nesting rules (parent/child relationships)
 *   - Studio catalog metadata (icon, label, description, snippet)
 *
 * Used by:
 *   - @wikipefia/mdx-renderer  (component map + rendering)
 *   - @wikipefia/mdx-compiler  (validation)
 *   - Studio                   (component insertion menu)
 */

// ── Types ───────────────────────────────────────────────

export type PropType = "string" | "number" | "boolean";

export interface PropContract {
  required?: boolean;
  type?: PropType;
  enum?: string[];
}

export type Category = "content" | "data" | "interactive" | "diagrams";

export interface CatalogMeta {
  icon: string;
  label: string;
  description: string;
  category: Category;
  snippet: string;
}

export interface ComponentEntry {
  /** Prop contracts for this component. */
  props: Record<string, PropContract>;
  /** If set, this component must be a direct child of the named parent. */
  parent?: string;
  /** Whether this component requires children. */
  childrenRequired?: boolean;
  /** Present only for top-level insertable components (shown in studio menu). */
  catalog?: CatalogMeta;
}

/** Backwards-compatible alias used by mdx-compiler. */
export type ComponentContract = ComponentEntry;

// ── Category metadata (for studio UI) ───────────────────

export const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  content:     { label: "Content",     icon: "¶" },
  data:        { label: "Data",        icon: "▤" },
  interactive: { label: "Interactive", icon: "⚡" },
  diagrams:    { label: "Diagrams",    icon: "◇" },
};

// ── Registry ────────────────────────────────────────────

export const componentRegistry: Record<string, ComponentEntry> = {
  // ── Callout ───────────────────────────────────
  Callout: {
    props: {
      type: { type: "string", enum: ["info", "warning", "error"] },
    },
    childrenRequired: true,
    catalog: {
      icon: "ℹ",
      label: "Callout",
      description: "Info, warning, or error callout box",
      category: "content",
      snippet: `<Callout type="info">\nYour note here.\n</Callout>`,
    },
  },

  // ── Definition ────────────────────────────────
  Definition: {
    props: {
      term: { required: true, type: "string" },
    },
    childrenRequired: true,
    catalog: {
      icon: "≡",
      label: "Definition",
      description: "Term definition block",
      category: "content",
      snippet: `<Definition term="Term">\nDefinition text here.\n</Definition>`,
    },
  },

  // ── Collapse ──────────────────────────────────
  Collapse: {
    props: {
      title: { required: true, type: "string" },
    },
    childrenRequired: true,
    catalog: {
      icon: "▼",
      label: "Collapse",
      description: "Expandable/collapsible section",
      category: "content",
      snippet: `<Collapse title="Section title">\nHidden content here.\n</Collapse>`,
    },
  },

  // ── Tabs ──────────────────────────────────────
  Tabs: {
    props: {},
    childrenRequired: true,
    catalog: {
      icon: "◫",
      label: "Tabs",
      description: "Tabbed content sections",
      category: "content",
      snippet: `<Tabs>\n<Tab label="First">\nFirst tab content.\n</Tab>\n<Tab label="Second">\nSecond tab content.\n</Tab>\n</Tabs>`,
    },
  },
  Tab: {
    props: {
      label: { required: true, type: "string" },
    },
    parent: "Tabs",
    childrenRequired: true,
  },

  // ── Figure ────────────────────────────────────
  Figure: {
    props: {
      src: { required: true, type: "string" },
      alt: { required: true, type: "string" },
      caption: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
    },
    catalog: {
      icon: "▣",
      label: "Figure",
      description: "Image with caption",
      category: "content",
      snippet: `<Figure src="/image.png" alt="Description" caption="Figure caption" />`,
    },
  },

  // ── Math Block ────────────────────────────────
  MathBlock: {
    props: {},
    childrenRequired: true,
    catalog: {
      icon: "∑",
      label: "Math Block",
      description: "LaTeX math expression block",
      category: "content",
      snippet: `<MathBlock>\nE = mc^2\n</MathBlock>`,
    },
  },

  // ── StepByStep ────────────────────────────────
  StepByStep: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
    catalog: {
      icon: "①",
      label: "Step by Step",
      description: "Numbered step-by-step guide",
      category: "content",
      snippet: `<StepByStep>\n<Step title="First">\nFirst step.\n</Step>\n<Step title="Second">\nSecond step.\n</Step>\n</StepByStep>`,
    },
  },
  Step: {
    props: {
      title: { required: true, type: "string" },
    },
    parent: "StepByStep",
    childrenRequired: true,
  },

  // ── Comparison ────────────────────────────────
  Comparison: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
    catalog: {
      icon: "⇔",
      label: "Comparison",
      description: "Side-by-side comparison",
      category: "content",
      snippet: `<Comparison>\n<ComparisonItem title="Option A">\nFirst option.\n</ComparisonItem>\n<ComparisonItem title="Option B">\nSecond option.\n</ComparisonItem>\n</Comparison>`,
    },
  },
  ComparisonItem: {
    props: {
      title: { required: true, type: "string" },
      color: { type: "string" },
    },
    parent: "Comparison",
    childrenRequired: true,
  },

  // ── DataTable ─────────────────────────────────
  DataTable: {
    props: {
      caption: { type: "string" },
      columns: {},
      rows: {},
      sortable: { type: "boolean" },
    },
    catalog: {
      icon: "▦",
      label: "Data Table",
      description: "Structured data table",
      category: "data",
      snippet: `<DataTable caption="Table" columns={["Column A", "Column B"]} rows={[["Cell 1", "Cell 2"]]} />`,
    },
  },

  // ── Timeline ──────────────────────────────────
  Timeline: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
    catalog: {
      icon: "━",
      label: "Timeline",
      description: "Chronological timeline",
      category: "data",
      snippet: `<Timeline>\n<TimelineEvent date="2024" title="Event">\nDescription.\n</TimelineEvent>\n</Timeline>`,
    },
  },
  TimelineEvent: {
    props: {
      date: { required: true, type: "string" },
      title: { required: true, type: "string" },
      color: { type: "string" },
    },
    parent: "Timeline",
  },

  // ── BarChart ──────────────────────────────────
  BarChart: {
    props: {
      title: { type: "string" },
      orientation: { type: "string", enum: ["horizontal", "vertical"] },
      animate: { type: "boolean" },
      showValues: { type: "boolean" },
    },
    childrenRequired: true,
    catalog: {
      icon: "▮",
      label: "Bar Chart",
      description: "Simple bar chart visualization",
      category: "data",
      snippet: `<BarChart title="Chart">\n<Bar label="A" value={40} />\n<Bar label="B" value={60} />\n</BarChart>`,
    },
  },
  Bar: {
    props: {
      label: { required: true, type: "string" },
      value: { type: "number" },
      expr: { type: "string" },
      color: { type: "string" },
    },
    parent: "BarChart",
  },

  // ── Quiz ──────────────────────────────────────
  Quiz: {
    props: {},
    childrenRequired: true,
    catalog: {
      icon: "?",
      label: "Quiz",
      description: "Interactive quiz with questions",
      category: "interactive",
      snippet: `<Quiz>\n<Question text="What is 2+2?">\n<Option correct>4</Option>\n<Option>5</Option>\n</Question>\n</Quiz>`,
    },
  },
  Question: {
    props: {
      text: { required: true, type: "string" },
    },
    parent: "Quiz",
    childrenRequired: true,
  },
  Option: {
    props: {
      value: { required: true, type: "string" },
      correct: { type: "boolean" },
    },
    parent: "Question",
  },

  // ── Code Playground ───────────────────────────
  CodePlayground: {
    props: {
      language: { type: "string" },
      code: { type: "string" },
    },
    catalog: {
      icon: "▶",
      label: "Code Playground",
      description: "Editable & runnable code block",
      category: "interactive",
      snippet: `<CodePlayground language="javascript">\nconsole.log("Hello!");\n</CodePlayground>`,
    },
  },

  // ── Graph (interactive function plotter) ──────
  Graph: {
    props: {
      title: { type: "string" },
      xLabel: { type: "string" },
      yLabel: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      xDomain: {},
      yDomain: {},
    },
    childrenRequired: true,
    catalog: {
      icon: "📈",
      label: "Graph",
      description: "Interactive coordinate graph",
      category: "interactive",
      snippet: `<Graph xMin={-5} xMax={5} yMin={-5} yMax={5}>\n<Plot fn="x^2" />\n</Graph>`,
    },
  },
  Plot: {
    props: {
      expr: { required: true, type: "string" },
      color: { type: "string" },
      label: { type: "string" },
      dashed: { type: "boolean" },
      strokeWidth: { type: "number" },
    },
    parent: "Graph",
  },
  Point: {
    props: {
      x: { required: true, type: "string" },
      y: { required: true, type: "string" },
      label: { type: "string" },
      color: { type: "string" },
      r: { type: "number" },
      showXLine: { type: "boolean" },
      showYLine: { type: "boolean" },
    },
    parent: "Graph",
  },
  HLine: {
    props: {
      y: { required: true, type: "string" },
      color: { type: "string" },
      dashed: { type: "boolean" },
      label: { type: "string" },
    },
    parent: "Graph",
  },
  VLine: {
    props: {
      x: { required: true, type: "string" },
      color: { type: "string" },
      dashed: { type: "boolean" },
      label: { type: "string" },
    },
    parent: "Graph",
  },
  Area: {
    props: {
      above: { required: true, type: "string" },
      below: { type: "string" },
      from: { required: true, type: "string" },
      to: { required: true, type: "string" },
      color: { type: "string" },
      opacity: { type: "number" },
      label: { type: "string" },
    },
    parent: "Graph",
  },
  Segment: {
    props: {
      x1: { required: true, type: "string" },
      y1: { required: true, type: "string" },
      x2: { required: true, type: "string" },
      y2: { required: true, type: "string" },
      color: { type: "string" },
      dashed: { type: "boolean" },
      strokeWidth: { type: "number" },
    },
    parent: "Graph",
  },
  Slider: {
    props: {
      name: { required: true, type: "string" },
      min: { type: "number" },
      max: { type: "number" },
      default: { type: "number" },
      step: { type: "number" },
      label: { type: "string" },
    },
  },

  // ── Interactive (reactive sandbox) ────────────
  Interactive: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
    catalog: {
      icon: "⚙",
      label: "Interactive",
      description: "Interactive widget with sliders",
      category: "interactive",
      snippet: `<Interactive>\n<Slider name="x" min={0} max={10} />\n<Value expr="x * 2" />\n</Interactive>`,
    },
  },
  Value: {
    props: {
      label: { required: true, type: "string" },
      expr: { required: true, type: "string" },
      decimals: { type: "number" },
      prefix: { type: "string" },
      suffix: { type: "string" },
    },
    parent: "Interactive",
  },
  Toggle: {
    props: {
      name: { required: true, type: "string" },
      default: { type: "boolean" },
      label: { type: "string" },
    },
    parent: "Interactive",
  },

  // ── FlowDiagram ──────────────────────────────
  FlowDiagram: {
    props: {
      title: { type: "string" },
      direction: { type: "string", enum: ["horizontal", "vertical"] },
      animate: { type: "boolean" },
    },
    childrenRequired: true,
    catalog: {
      icon: "→",
      label: "Flow Diagram",
      description: "Flowchart with nodes and arrows",
      category: "diagrams",
      snippet: `<FlowDiagram>\n<FlowNode id="a" label="Start" />\n<FlowNode id="b" label="End" />\n<FlowArrow from="a" to="b" />\n</FlowDiagram>`,
    },
  },
  FlowNode: {
    props: {
      id: { required: true, type: "string" },
      label: { required: true, type: "string" },
      icon: { type: "string" },
      color: { type: "string" },
      highlight: { type: "boolean" },
    },
    parent: "FlowDiagram",
  },
  FlowArrow: {
    props: {
      from: { required: true, type: "string" },
      to: { required: true, type: "string" },
      label: { type: "string" },
      color: { type: "string" },
      animated: { type: "boolean" },
    },
    parent: "FlowDiagram",
  },

  // ── CycleDiagram ─────────────────────────────
  CycleDiagram: {
    props: {
      title: { type: "string" },
      size: { type: "number" },
      animate: { type: "boolean" },
      clockwise: { type: "boolean" },
    },
    childrenRequired: true,
    catalog: {
      icon: "↻",
      label: "Cycle Diagram",
      description: "Circular cycle diagram",
      category: "diagrams",
      snippet: `<CycleDiagram>\n<CycleNode label="Step 1" />\n<CycleNode label="Step 2" />\n<CycleNode label="Step 3" />\n</CycleDiagram>`,
    },
  },
  CycleNode: {
    props: {
      label: { required: true, type: "string" },
      color: { type: "string" },
      description: { type: "string" },
      icon: { type: "string" },
    },
    parent: "CycleDiagram",
  },

  // ── Diagram (low-level canvas) ────────────────
  Diagram: {
    props: {
      title: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      animate: { type: "boolean" },
    },
    childrenRequired: true,
    catalog: {
      icon: "◇",
      label: "Diagram",
      description: "Free-form diagram with shapes",
      category: "diagrams",
      snippet: `<Diagram>\n<DBox x={0} y={0} label="Box" />\n<DCircle x={200} y={0} label="Circle" />\n<DArrow from="Box" to="Circle" />\n</Diagram>`,
    },
  },
  DBox: {
    props: {
      x: { required: true, type: "number" },
      y: { required: true, type: "number" },
      w: { required: true, type: "number" },
      h: { required: true, type: "number" },
      label: { type: "string" },
      color: { type: "string" },
      rounded: { type: "boolean" },
    },
    parent: "Diagram",
  },
  DCircle: {
    props: {
      x: { required: true, type: "number" },
      y: { required: true, type: "number" },
      r: { required: true, type: "number" },
      label: { type: "string" },
      color: { type: "string" },
      pulse: { type: "boolean" },
    },
    parent: "Diagram",
  },
  DArrow: {
    props: {
      from: {},
      to: {},
      label: { type: "string" },
      color: { type: "string" },
      animated: { type: "boolean" },
      curved: { type: "boolean" },
    },
    parent: "Diagram",
  },
  DLabel: {
    props: {
      x: { required: true, type: "number" },
      y: { required: true, type: "number" },
      text: { required: true, type: "string" },
      fontSize: { type: "number" },
      color: { type: "string" },
      bold: { type: "boolean" },
    },
    parent: "Diagram",
  },
};

// ── Derived helpers ─────────────────────────────────────

/** Set of all known component names for quick lookup. */
export const knownComponentNames = new Set(Object.keys(componentRegistry));

/** Catalog entry for the studio component insertion menu. */
export interface CatalogEntry {
  name: string;
  icon: string;
  label: string;
  description: string;
  category: Category;
  snippet: string;
}

/** Catalog entries (only components with `catalog` metadata). */
export const catalogEntries: CatalogEntry[] = Object.entries(componentRegistry)
  .filter(([, entry]) => entry.catalog != null)
  .map(([name, entry]) => ({
    name,
    ...entry.catalog!,
  }));
