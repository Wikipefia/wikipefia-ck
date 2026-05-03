/**
 * Names of widgets always available to the model in every step's `activeTools`.
 *
 * These are the high-frequency widgets the model picks from for typical
 * teaching answers. The remaining ~10 widgets are gated behind
 * `lookupWidgetDocs(name)` which expands `activeTools` for subsequent steps.
 */
export const CORE_TIER_WIDGETS = [
  "Callout",
  "Definition",
  "Collapse",
  "Quiz",
  "DataTable",
  "Figure",
  "MathBlock",
  "BarChart",
  "Timeline",
  "StepByStep",
] as const;

export type CoreTierWidget = (typeof CORE_TIER_WIDGETS)[number];

/** All widgets that exist beyond core. The model can unlock these via lookupWidgetDocs. */
export const SECONDARY_TIER_WIDGETS = [
  "Tabs",
  "Comparison",
  "CodePlayground",
  "Interactive",
  "Graph",
  "FlowDiagram",
  "CycleDiagram",
  "Diagram",
] as const;
