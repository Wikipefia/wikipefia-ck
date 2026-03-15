/**
 * Custom MDX component map — single source of truth is @wikipefia/mdx-renderer.
 * This file wires the shared components + typography with app-specific overrides.
 */

import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import {
  Callout, Tabs, Tab, Collapse, Definition, Figure, MathBlock,
  Quiz, Question, Option, CodePlayground,
  Graph, Plot, Slider, Point, HLine, VLine, Area, Segment,
  Interactive, Value, Toggle,
  Timeline, TimelineEvent, DataTable,
  Comparison, ComparisonItem,
  StepByStep, Step,
  FlowDiagram, FlowNode, FlowArrow,
  CycleDiagram, CycleNode,
  BarChart, Bar,
  Diagram, DBox, DCircle, DArrow, DLabel,
  createTypography,
} from "@wikipefia/mdx-renderer";

const typography = createTypography({ Link });

export const mdxComponents: MDXComponents = {
  // Custom content components
  Callout, Tabs, Tab, Collapse, Definition, Figure, MathBlock,

  // Interactive
  Quiz, Question, Option, CodePlayground,
  Graph, Plot, Slider, Point, HLine, VLine, Area, Segment,
  Interactive, Value, Toggle,

  // Article structure
  Timeline, TimelineEvent, DataTable,
  Comparison, ComparisonItem,
  StepByStep, Step,

  // Diagrams
  FlowDiagram, FlowNode, FlowArrow,
  CycleDiagram, CycleNode,
  BarChart, Bar,
  Diagram, DBox, DCircle, DArrow, DLabel,

  // Typography overrides
  ...typography,
};
