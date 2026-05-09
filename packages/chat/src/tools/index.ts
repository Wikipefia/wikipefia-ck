/**
 * Tools subpath of @wikipefia/chat — pure TypeScript, no React, no Node.
 * Importable from Convex Node actions and from React UI alike.
 */

export {
  zodFromContract,
  zodObjectFromProps,
} from "./zod-from-contract";

export {
  COMPOSITE_WIDGET_NAMES,
  COMPOSITE_SCHEMAS,
  COMPOSITE_DESCRIPTIONS,
  QuizSchema,
  TabsSchema,
  ComparisonSchema,
  TimelineSchema,
  BarChartSchema,
  StepByStepSchema,
  GraphSchema,
  FlowDiagramSchema,
  CycleDiagramSchema,
  DiagramSchema,
  InteractiveSchema,
} from "./composite-flatten";

export {
  buildWidgetTools,
  getAllWidgetToolNames,
  type BuildToolsOptions,
} from "./build-tools";

export {
  CORE_TIER_WIDGETS,
  SECONDARY_TIER_WIDGETS,
  type CoreTierWidget,
} from "./core-tier";

export {
  WIDGET_DOCS,
  getDocumentedWidgetNames,
  type WidgetDoc,
} from "./widget-docs";

export {
  SYSTEM_PROMPT_V1,
  SYSTEM_PROMPT_VERSION,
  widgetCatalogLines,
} from "./system-prompt";
