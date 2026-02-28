/**
 * Component registry — defines the contract for all custom MDX components.
 *
 * This is NOT the React implementation. It defines:
 *   - Which components are allowed in MDX
 *   - Required / optional props and their types
 *   - Nesting rules (which component must be a child of which)
 *
 * The actual React components live in the main project (components/mdx/).
 * They must conform to these contracts.
 */

export type PropType = "string" | "number" | "boolean";

export interface PropContract {
  /** Whether this prop is required. */
  required?: boolean;
  /** Expected type of the prop value. */
  type?: PropType;
  /** If set, the prop must be one of these values. */
  enum?: string[];
}

export interface ComponentContract {
  /** Prop contracts for this component. */
  props: Record<string, PropContract>;
  /** If set, this component must be a direct child of the named parent. */
  parent?: string;
  /** Whether this component requires children. */
  childrenRequired?: boolean;
}

/**
 * Registry of all custom MDX components and their contracts.
 *
 * When adding a new component to the main project, add its contract here
 * first, then implement the React component. This ensures content repos
 * can validate against the new component immediately.
 */
export const componentRegistry: Record<string, ComponentContract> = {
  // ── Interactive Quiz ──────────────────────────
  Quiz: {
    props: {},
    childrenRequired: true,
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

  // ── Callout ───────────────────────────────────
  Callout: {
    props: {
      type: { type: "string", enum: ["info", "warning", "error"] },
    },
    childrenRequired: true,
  },

  // ── Tabs ──────────────────────────────────────
  Tabs: {
    props: {},
    childrenRequired: true,
  },
  Tab: {
    props: {
      label: { required: true, type: "string" },
    },
    parent: "Tabs",
    childrenRequired: true,
  },

  // ── Collapse ──────────────────────────────────
  Collapse: {
    props: {
      title: { required: true, type: "string" },
    },
    childrenRequired: true,
  },

  // ── Code Playground ───────────────────────────
  CodePlayground: {
    props: {
      language: { type: "string" },
      code: { type: "string" },
    },
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
  },

  // ── Math Block ────────────────────────────────
  MathBlock: {
    props: {},
    childrenRequired: true,
  },

  // ── Graph (interactive function plotter) ─────
  Graph: {
    props: {
      title: { type: "string" },
      xLabel: { type: "string" },
      yLabel: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      xDomain: {}, // array expression — validated at runtime
      yDomain: {}, // array expression — validated at runtime
    },
    childrenRequired: true,
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
    // No parent constraint — used in both Graph and Interactive
  },

  // ── Interactive (reactive sandbox) ───────────
  Interactive: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
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

  // ── Timeline ─────────────────────────────────
  Timeline: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
  },
  TimelineEvent: {
    props: {
      date: { required: true, type: "string" },
      title: { required: true, type: "string" },
      color: { type: "string" },
    },
    parent: "Timeline",
  },

  // ── DataTable ────────────────────────────────
  DataTable: {
    props: {
      caption: { type: "string" },
      columns: {}, // array expression — validated at runtime
      rows: {},    // array expression — validated at runtime
      sortable: { type: "boolean" },
    },
  },

  // ── Comparison ───────────────────────────────
  Comparison: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
  },
  ComparisonItem: {
    props: {
      title: { required: true, type: "string" },
      color: { type: "string" },
    },
    parent: "Comparison",
    childrenRequired: true,
  },

  // ── Definition ───────────────────────────────
  Definition: {
    props: {
      term: { required: true, type: "string" },
    },
    childrenRequired: true,
  },

  // ── StepByStep ───────────────────────────────
  StepByStep: {
    props: {
      title: { type: "string" },
    },
    childrenRequired: true,
  },
  Step: {
    props: {
      title: { required: true, type: "string" },
    },
    parent: "StepByStep",
    childrenRequired: true,
  },

  // ── FlowDiagram ───────────────────────────────
  FlowDiagram: {
    props: {
      title: { type: "string" },
      direction: { type: "string", enum: ["horizontal", "vertical"] },
      animate: { type: "boolean" },
    },
    childrenRequired: true,
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

  // ── CycleDiagram ──────────────────────────────
  CycleDiagram: {
    props: {
      title: { type: "string" },
      size: { type: "number" },
      animate: { type: "boolean" },
      clockwise: { type: "boolean" },
    },
    childrenRequired: true,
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

  // ── BarChart ──────────────────────────────────
  BarChart: {
    props: {
      title: { type: "string" },
      orientation: { type: "string", enum: ["horizontal", "vertical"] },
      animate: { type: "boolean" },
      showValues: { type: "boolean" },
    },
    childrenRequired: true,
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

  // ── Diagram (low-level canvas) ────────────────
  Diagram: {
    props: {
      title: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      animate: { type: "boolean" },
    },
    childrenRequired: true,
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
      from: {}, // array expression
      to: {},   // array expression
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

/** Set of all known component names for quick lookup. */
export const knownComponentNames = new Set(Object.keys(componentRegistry));
