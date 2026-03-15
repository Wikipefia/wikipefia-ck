import type { ComponentType } from "react";

export { Callout } from "./callout";
export { Tabs, Tab } from "./tabs";
export { Collapse } from "./collapse";
export { Definition } from "./definition";
export { Figure } from "./figure";
export { MathBlock } from "./math-block";
export { Quiz, Question, Option } from "./quiz";
export { CodePlayground } from "./code-playground";
export { Interactive, Value, Toggle } from "./interactive";
export { Graph, Plot, Slider, Point, HLine, VLine, Area, Segment } from "./graph";
export { Timeline, TimelineEvent } from "./timeline";
export { DataTable } from "./data-table";
export { Comparison, ComparisonItem } from "./comparison";
export { StepByStep, Step } from "./step-by-step";
export { FlowDiagram, FlowNode, FlowArrow } from "./flow-diagram";
export { CycleDiagram, CycleNode } from "./cycle-diagram";
export { BarChart, Bar } from "./bar-chart";
export { Diagram, DBox, DCircle, DArrow, DLabel } from "./diagram";

// ── Component map (auto-builds MDX component mapping) ───

import { Callout } from "./callout";
import { Tabs, Tab } from "./tabs";
import { Collapse } from "./collapse";
import { Definition } from "./definition";
import { Figure } from "./figure";
import { MathBlock } from "./math-block";
import { Quiz, Question, Option } from "./quiz";
import { CodePlayground } from "./code-playground";
import { Interactive, Value, Toggle } from "./interactive";
import { Graph, Plot, Slider, Point, HLine, VLine, Area, Segment } from "./graph";
import { Timeline, TimelineEvent } from "./timeline";
import { DataTable } from "./data-table";
import { Comparison, ComparisonItem } from "./comparison";
import { StepByStep, Step } from "./step-by-step";
import { FlowDiagram, FlowNode, FlowArrow } from "./flow-diagram";
import { CycleDiagram, CycleNode } from "./cycle-diagram";
import { BarChart, Bar } from "./bar-chart";
import { Diagram, DBox, DCircle, DArrow, DLabel } from "./diagram";

/**
 * Pre-built map of component name → React component.
 * Apps spread this into their MDX component map alongside typography.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const componentMap: Record<string, ComponentType<any>> = {
  Callout, Tabs, Tab, Collapse, Definition, Figure, MathBlock,
  Quiz, Question, Option, CodePlayground,
  Interactive, Value, Toggle,
  Graph, Plot, Slider, Point, HLine, VLine, Area, Segment,
  Timeline, TimelineEvent, DataTable,
  Comparison, ComparisonItem,
  StepByStep, Step,
  FlowDiagram, FlowNode, FlowArrow,
  CycleDiagram, CycleNode,
  BarChart, Bar,
  Diagram, DBox, DCircle, DArrow, DLabel,
};
