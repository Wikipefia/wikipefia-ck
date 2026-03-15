export interface CatalogEntry {
  name: string;
  icon: string;
  label: string;
  description: string;
  category: Category;
  snippet: string;
}

export type Category = "content" | "data" | "interactive" | "diagrams";

export const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  content:     { label: "Content",     icon: "¶" },
  data:        { label: "Data",        icon: "▤" },
  interactive: { label: "Interactive", icon: "⚡" },
  diagrams:    { label: "Diagrams",    icon: "◇" },
};

/**
 * Single source of truth for all insertable MDX components.
 * Used by both the component menu (insert snippets) and
 * the MDX renderer (register React implementations).
 */
export const COMPONENT_CATALOG: CatalogEntry[] = [
  // ── Content ──────────────────────────────────────────
  {
    name: "Callout",
    icon: "ℹ",
    label: "Callout",
    description: "Info, warning, or error callout box",
    category: "content",
    snippet: `<Callout type="info">\nYour note here.\n</Callout>`,
  },
  {
    name: "Definition",
    icon: "≡",
    label: "Definition",
    description: "Term definition block",
    category: "content",
    snippet: `<Definition term="Term">\nDefinition text here.\n</Definition>`,
  },
  {
    name: "Collapse",
    icon: "▼",
    label: "Collapse",
    description: "Expandable/collapsible section",
    category: "content",
    snippet: `<Collapse title="Section title">\nHidden content here.\n</Collapse>`,
  },
  {
    name: "Tabs",
    icon: "◫",
    label: "Tabs",
    description: "Tabbed content sections",
    category: "content",
    snippet: `<Tabs>\n<Tab label="First">\nFirst tab content.\n</Tab>\n<Tab label="Second">\nSecond tab content.\n</Tab>\n</Tabs>`,
  },
  {
    name: "StepByStep",
    icon: "①",
    label: "Step by Step",
    description: "Numbered step-by-step guide",
    category: "content",
    snippet: `<StepByStep>\n<Step>\nFirst step.\n</Step>\n<Step>\nSecond step.\n</Step>\n</StepByStep>`,
  },
  {
    name: "Comparison",
    icon: "⇔",
    label: "Comparison",
    description: "Side-by-side comparison",
    category: "content",
    snippet: `<Comparison>\n<ComparisonItem label="Option A">\nFirst option.\n</ComparisonItem>\n<ComparisonItem label="Option B">\nSecond option.\n</ComparisonItem>\n</Comparison>`,
  },
  {
    name: "Figure",
    icon: "▣",
    label: "Figure",
    description: "Image with caption",
    category: "content",
    snippet: `<Figure src="/image.png" alt="Description" caption="Figure caption" />`,
  },
  {
    name: "MathBlock",
    icon: "∑",
    label: "Math Block",
    description: "LaTeX math expression block",
    category: "content",
    snippet: `<MathBlock>\nE = mc^2\n</MathBlock>`,
  },

  // ── Data ─────────────────────────────────────────────
  {
    name: "DataTable",
    icon: "▦",
    label: "Data Table",
    description: "Structured data table",
    category: "data",
    snippet: `<DataTable>\n| Column A | Column B |\n|----------|----------|\n| Cell 1   | Cell 2   |\n</DataTable>`,
  },
  {
    name: "Timeline",
    icon: "━",
    label: "Timeline",
    description: "Chronological timeline",
    category: "data",
    snippet: `<Timeline>\n<TimelineEvent date="2024" title="Event">\nDescription.\n</TimelineEvent>\n</Timeline>`,
  },
  {
    name: "BarChart",
    icon: "▮",
    label: "Bar Chart",
    description: "Simple bar chart visualization",
    category: "data",
    snippet: `<BarChart title="Chart">\n<Bar label="A" value={40} />\n<Bar label="B" value={60} />\n</BarChart>`,
  },

  // ── Interactive ──────────────────────────────────────
  {
    name: "Quiz",
    icon: "?",
    label: "Quiz",
    description: "Interactive quiz with questions",
    category: "interactive",
    snippet: `<Quiz>\n<Question text="What is 2+2?">\n<Option correct>4</Option>\n<Option>5</Option>\n</Question>\n</Quiz>`,
  },
  {
    name: "CodePlayground",
    icon: "▶",
    label: "Code Playground",
    description: "Editable & runnable code block",
    category: "interactive",
    snippet: `<CodePlayground language="javascript">\nconsole.log("Hello!");\n</CodePlayground>`,
  },
  {
    name: "Graph",
    icon: "📈",
    label: "Graph",
    description: "Interactive coordinate graph",
    category: "interactive",
    snippet: `<Graph xMin={-5} xMax={5} yMin={-5} yMax={5}>\n<Plot fn="x^2" />\n</Graph>`,
  },
  {
    name: "Interactive",
    icon: "⚙",
    label: "Interactive",
    description: "Interactive widget with sliders",
    category: "interactive",
    snippet: `<Interactive>\n<Slider name="x" min={0} max={10} />\n<Value expr="x * 2" />\n</Interactive>`,
  },

  // ── Diagrams ─────────────────────────────────────────
  {
    name: "FlowDiagram",
    icon: "→",
    label: "Flow Diagram",
    description: "Flowchart with nodes and arrows",
    category: "diagrams",
    snippet: `<FlowDiagram>\n<FlowNode id="a" label="Start" />\n<FlowNode id="b" label="End" />\n<FlowArrow from="a" to="b" />\n</FlowDiagram>`,
  },
  {
    name: "CycleDiagram",
    icon: "↻",
    label: "Cycle Diagram",
    description: "Circular cycle diagram",
    category: "diagrams",
    snippet: `<CycleDiagram>\n<CycleNode label="Step 1" />\n<CycleNode label="Step 2" />\n<CycleNode label="Step 3" />\n</CycleDiagram>`,
  },
  {
    name: "Diagram",
    icon: "◇",
    label: "Diagram",
    description: "Free-form diagram with shapes",
    category: "diagrams",
    snippet: `<Diagram>\n<DBox x={0} y={0} label="Box" />\n<DCircle x={200} y={0} label="Circle" />\n<DArrow from="Box" to="Circle" />\n</Diagram>`,
  },
];

/** All unique component names referenced in catalog snippets (parents + children). */
export const ALL_COMPONENT_NAMES: string[] = [
  // Parents (from catalog)
  ...COMPONENT_CATALOG.map((c) => c.name),
  // Children (used inside parent snippets, not independently insertable)
  "Tab",
  "Step",
  "ComparisonItem",
  "TimelineEvent",
  "Question",
  "Option",
  "Bar",
  "Plot",
  "Slider",
  "Point",
  "HLine",
  "VLine",
  "Area",
  "Segment",
  "Value",
  "Toggle",
  "FlowNode",
  "FlowArrow",
  "CycleNode",
  "DBox",
  "DCircle",
  "DArrow",
  "DLabel",
];
