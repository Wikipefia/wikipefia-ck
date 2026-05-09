"use client";

import { Component, type ReactNode } from "react";
import {
  componentMap,
  Tabs,
  Tab,
  Comparison,
  ComparisonItem,
  Timeline,
  TimelineEvent,
  BarChart,
  Bar,
  StepByStep,
  Step,
  FlowDiagram,
  FlowNode,
  FlowArrow,
  CycleDiagram,
  CycleNode,
  Diagram,
  DBox,
  DCircle,
  DArrow,
  DLabel,
  Graph,
  Plot,
  Point,
  Interactive,
  Slider,
  Toggle,
  Value,
} from "@wikipefia/mdx-renderer/components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { createTypography } from "@wikipefia/mdx-renderer";
import { C } from "@wikipefia/mdx-renderer/theme";
import { COMPOSITE_WIDGET_NAMES } from "../../../tools";
import { InlineMarkdown } from "./inline-markdown";
import { normalizeLatexDelimiters } from "../parts/normalize-latex";

const typography = createTypography();

// Plugin arrays kept module-level so react-markdown's plugin identity check
// doesn't re-instantiate on every widget render.
//
// remarkBreaks turns soft "\n" line breaks into <br/> — without it the model's
// "✓ item one\n✓ item two\n✓ item three" inside Comparison/Tabs/StepByStep
// content fields collapses into a single run-on paragraph. CommonMark
// strictly requires "\n\n" for a new paragraph, but models routinely use
// "\n" for visual line breaks.
const BODY_REMARK_PLUGINS = [remarkGfm, remarkBreaks, remarkMath];
const BODY_REHYPE_PLUGINS = [rehypeKatex];

// ── Defensive helpers ───────────────────────────────────────
// Models occasionally return malformed args (e.g. an object where an
// array is expected, or missing required fields). These helpers normalize
// values so a single bad widget doesn't crash the whole chat.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toArray(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") {
    // Sometimes models emit numeric-keyed objects { "0": ..., "1": ... }.
    const keys = Object.keys(x);
    if (keys.every((k) => /^\d+$/.test(k))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => x[k]);
    }
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toString(x: any, fallback = ""): string {
  if (typeof x === "string") return x;
  if (x == null) return fallback;
  return String(x);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNumber(x: any, fallback = 0): number {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBool(x: any, fallback = false): boolean {
  if (typeof x === "boolean") return x;
  if (x === "true") return true;
  if (x === "false") return false;
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asObject(x: any): Record<string, any> {
  if (x && typeof x === "object" && !Array.isArray(x)) return x;
  return {};
}

/**
 * Render markdown text inside a widget body (e.g. Callout content, Tab content).
 */
function MarkdownBody({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={BODY_REMARK_PLUGINS}
      rehypePlugins={BODY_REHYPE_PLUGINS}
      components={typography}
    >
      {text}
    </ReactMarkdown>
  );
}


interface RenderInput {
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
}

/**
 * Maps a flat composite tool args shape back into the proper React tree.
 * Returns `null` for unknown widgets so caller can render a fallback.
 *
 * Every accessor goes through to* helpers so malformed model output produces
 * a degraded but functioning render rather than crashing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expandComposite(toolName: string, rawArgs: any): ReactNode {
  const args = asObject(rawArgs);

  switch (toolName) {
    case "Quiz":
      // Quiz is rendered separately by InteractiveQuiz — but we provide a
      // read-only fallback for snapshots / non-interactive views.
      return (
        <div className="border-2 my-4 p-4" style={{ borderColor: C.border }}>
          <div className="text-[10px] uppercase font-bold tracking-wider mb-2">
            Quiz (read-only preview)
          </div>
          {toArray(args.questions).map((q: any, i: number) => {
            const qObj = asObject(q);
            return (
              <div key={i} className="mb-3">
                <div style={{ fontFamily: "var(--font-serif)" }}>
                  {toString(qObj.text)}
                </div>
                <ul className="text-[13px] mt-1">
                  {toArray(qObj.options).map((o: any, j: number) => {
                    const oObj = asObject(o);
                    return (
                      <li key={j}>
                        {toBool(oObj.correct) ? "✓" : "○"}{" "}
                        {toString(oObj.value)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      );

    case "Tabs": {
      const tabs = toArray(args.tabs);
      if (tabs.length === 0) return null;
      return (
        <Tabs>
          {tabs.map((t, i) => {
            const tObj = asObject(t);
            return (
              <Tab key={i} label={toString(tObj.label, `Tab ${i + 1}`)}>
                <MarkdownBody text={toString(tObj.content)} />
              </Tab>
            );
          })}
        </Tabs>
      );
    }

    case "Comparison": {
      const items = toArray(args.items);
      if (items.length === 0) return null;
      return (
        <Comparison title={toString(args.title) || undefined}>
          {items.map((item, i) => {
            const o = asObject(item);
            return (
              <ComparisonItem
                key={i}
                title={toString(o.title, `Item ${i + 1}`)}
                color={typeof o.color === "string" ? o.color : undefined}
              >
                <MarkdownBody text={toString(o.content)} />
              </ComparisonItem>
            );
          })}
        </Comparison>
      );
    }

    case "Timeline": {
      const events = toArray(args.events);
      if (events.length === 0) return null;
      return (
        <Timeline title={toString(args.title) || undefined}>
          {events.map((e, i) => {
            const o = asObject(e);
            return (
              <TimelineEvent
                key={i}
                date={toString(o.date)}
                title={toString(o.title)}
                color={typeof o.color === "string" ? o.color : undefined}
              >
                {o.description ? (
                  <MarkdownBody text={toString(o.description)} />
                ) : null}
              </TimelineEvent>
            );
          })}
        </Timeline>
      );
    }

    case "BarChart": {
      const bars = toArray(args.bars);
      if (bars.length === 0) return null;
      const orientation =
        args.orientation === "horizontal" ? "horizontal" : "vertical";
      return (
        <BarChart
          title={toString(args.title) || undefined}
          orientation={orientation}
          animate={toBool(args.animate)}
          showValues={toBool(args.showValues)}
        >
          {bars.map((b, i) => {
            const o = asObject(b);
            return (
              <Bar
                key={i}
                label={toString(o.label)}
                value={toNumber(o.value)}
                color={typeof o.color === "string" ? o.color : undefined}
              />
            );
          })}
        </BarChart>
      );
    }

    case "StepByStep": {
      const steps = toArray(args.steps);
      if (steps.length === 0) return null;
      return (
        <StepByStep title={toString(args.title) || undefined}>
          {steps.map((s, i) => {
            const o = asObject(s);
            return (
              <Step key={i} title={toString(o.title, `Step ${i + 1}`)}>
                <MarkdownBody text={toString(o.content)} />
              </Step>
            );
          })}
        </StepByStep>
      );
    }

    case "FlowDiagram": {
      const nodes = toArray(args.nodes);
      const arrows = toArray(args.arrows);
      if (nodes.length === 0) return null;
      const direction =
        args.direction === "vertical" ? "vertical" : "horizontal";
      return (
        <FlowDiagram
          title={toString(args.title) || undefined}
          direction={direction}
          animate={toBool(args.animate)}
        >
          {nodes.map((n, i) => {
            const o = asObject(n);
            return (
              <FlowNode
                key={`node-${i}`}
                id={toString(o.id, `n${i}`)}
                label={toString(o.label)}
                icon={typeof o.icon === "string" ? o.icon : undefined}
                color={typeof o.color === "string" ? o.color : undefined}
                highlight={toBool(o.highlight)}
              />
            );
          })}
          {arrows.map((a, i) => {
            const o = asObject(a);
            return (
              <FlowArrow
                key={`arrow-${i}`}
                from={toString(o.from)}
                to={toString(o.to)}
                label={typeof o.label === "string" ? o.label : undefined}
                color={typeof o.color === "string" ? o.color : undefined}
                animated={toBool(o.animated)}
              />
            );
          })}
        </FlowDiagram>
      );
    }

    case "CycleDiagram": {
      const nodes = toArray(args.nodes);
      if (nodes.length === 0) return null;
      return (
        <CycleDiagram
          title={toString(args.title) || undefined}
          size={typeof args.size === "number" ? args.size : undefined}
          animate={toBool(args.animate)}
          clockwise={toBool(args.clockwise)}
        >
          {nodes.map((n, i) => {
            const o = asObject(n);
            return (
              <CycleNode
                key={i}
                label={toString(o.label)}
                color={typeof o.color === "string" ? o.color : undefined}
                description={
                  typeof o.description === "string" ? o.description : undefined
                }
                icon={typeof o.icon === "string" ? o.icon : undefined}
              />
            );
          })}
        </CycleDiagram>
      );
    }

    case "Diagram": {
      const boxes = toArray(args.boxes);
      const circles = toArray(args.circles);
      const arrows = toArray(args.arrows);
      const labels = toArray(args.labels);
      return (
        <Diagram
          title={toString(args.title) || undefined}
          width={typeof args.width === "number" ? args.width : undefined}
          height={typeof args.height === "number" ? args.height : undefined}
          animate={toBool(args.animate)}
        >
          {boxes.map((b, i) => {
            const o = asObject(b);
            return (
              <DBox
                key={`box-${i}`}
                x={toNumber(o.x)}
                y={toNumber(o.y)}
                w={toNumber(o.w)}
                h={toNumber(o.h)}
                label={typeof o.label === "string" ? o.label : undefined}
                color={typeof o.color === "string" ? o.color : undefined}
              />
            );
          })}
          {circles.map((c, i) => {
            const o = asObject(c);
            return (
              <DCircle
                key={`circle-${i}`}
                x={toNumber(o.x)}
                y={toNumber(o.y)}
                r={toNumber(o.r)}
                label={typeof o.label === "string" ? o.label : undefined}
                color={typeof o.color === "string" ? o.color : undefined}
              />
            );
          })}
          {arrows.map((a, i) => {
            const o = asObject(a);
            // DArrow accepts either a label-string (matched against DBox/DCircle labels)
            // or [x, y] coordinate tuples — the mdx-renderer component handles both.
            // We pass through whatever the model gave us and let the widget cope.
            return (
              <DArrow
                key={`arrow-${i}`}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                from={o.from as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={o.to as any}
                label={typeof o.label === "string" ? o.label : undefined}
                color={typeof o.color === "string" ? o.color : undefined}
              />
            );
          })}
          {labels.map((l, i) => {
            const o = asObject(l);
            return (
              <DLabel
                key={`label-${i}`}
                x={toNumber(o.x)}
                y={toNumber(o.y)}
                text={toString(o.text)}
                bold={toBool(o.bold)}
              />
            );
          })}
        </Diagram>
      );
    }

    case "Graph": {
      const plots = toArray(args.plots);
      const points = toArray(args.points);
      const xMin = typeof args.xMin === "number" ? args.xMin : undefined;
      const xMax = typeof args.xMax === "number" ? args.xMax : undefined;
      const yMin = typeof args.yMin === "number" ? args.yMin : undefined;
      const yMax = typeof args.yMax === "number" ? args.yMax : undefined;
      return (
        <Graph
          title={toString(args.title) || undefined}
          xLabel={typeof args.xLabel === "string" ? args.xLabel : undefined}
          yLabel={typeof args.yLabel === "string" ? args.yLabel : undefined}
          width={typeof args.width === "number" ? args.width : undefined}
          height={typeof args.height === "number" ? args.height : undefined}
          xDomain={xMin !== undefined && xMax !== undefined ? [xMin, xMax] : undefined}
          yDomain={yMin !== undefined && yMax !== undefined ? [yMin, yMax] : undefined}
        >
          {plots.map((p, i) => {
            const o = asObject(p);
            return (
              <Plot
                key={`plot-${i}`}
                expr={toString(o.expr)}
                color={typeof o.color === "string" ? o.color : undefined}
                label={typeof o.label === "string" ? o.label : undefined}
                dashed={toBool(o.dashed)}
              />
            );
          })}
          {points.map((p, i) => {
            const o = asObject(p);
            return (
              <Point
                key={`pt-${i}`}
                x={toString(o.x)}
                y={toString(o.y)}
                label={typeof o.label === "string" ? o.label : undefined}
                color={typeof o.color === "string" ? o.color : undefined}
              />
            );
          })}
        </Graph>
      );
    }

    case "Interactive": {
      const sliders = toArray(args.sliders);
      const toggles = toArray(args.toggles);
      const values = toArray(args.values);
      if (values.length === 0) return null;
      return (
        <Interactive title={toString(args.title) || undefined}>
          {sliders.map((s, i) => {
            const o = asObject(s);
            return (
              <Slider
                key={`slider-${i}`}
                name={toString(o.name, `s${i}`)}
                min={toNumber(o.min)}
                max={toNumber(o.max, 1)}
                default={toNumber(o.default)}
                step={typeof o.step === "number" ? o.step : undefined}
                label={typeof o.label === "string" ? o.label : undefined}
              />
            );
          })}
          {toggles.map((t, i) => {
            const o = asObject(t);
            return (
              <Toggle
                key={`toggle-${i}`}
                name={toString(o.name, `t${i}`)}
                default={toBool(o.default)}
                label={typeof o.label === "string" ? o.label : undefined}
              />
            );
          })}
          {values.map((v, i) => {
            const o = asObject(v);
            return (
              <Value
                key={`value-${i}`}
                label={toString(o.label)}
                expr={toString(o.expr)}
                decimals={typeof o.decimals === "number" ? o.decimals : undefined}
                prefix={typeof o.prefix === "string" ? o.prefix : undefined}
                suffix={typeof o.suffix === "string" ? o.suffix : undefined}
              />
            );
          })}
        </Interactive>
      );
    }

    default:
      return null;
  }
}

/**
 * Render a simple (non-composite) widget by mapping toolName → componentMap.
 * Children are markdown text passed via the `content` arg.
 *
 * DataTable gets special treatment: we inject an `renderCell` callback so
 * each cell (and column header) goes through inline markdown — which means
 * `$...$` LaTeX, **bold**, *italic*, links etc. all work inside cells.
 *
 * MathBlock also gets special treatment: the model is told to pass raw
 * LaTeX (no delimiters), but our markdown pipeline only invokes KaTeX
 * when content is wrapped in `$$...$$`. So for MathBlock we ensure the
 * content is properly delimited before handing off to MarkdownBody.
 * Without this, equations render as plain text with visible `\quad`,
 * `\text{...}`, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSimple(toolName: string, rawArgs: any): ReactNode {
  const Component = componentMap[toolName];
  if (!Component) return null;
  const args = asObject(rawArgs);
  const { content, ...props } = args;

  if (toolName === "DataTable") {
    return (
      <Component
        {...props}
        renderCell={(text: string) =>
          text ? <InlineMarkdown text={text} /> : null
        }
      />
    );
  }

  if (toolName === "MathBlock") {
    const wrapped = wrapAsDisplayMath(typeof content === "string" ? content : "");
    if (wrapped == null) return null;
    return (
      <Component {...props}>
        <MarkdownBody text={wrapped} />
      </Component>
    );
  }

  if (typeof content === "string" && content.length > 0) {
    return (
      <Component {...props}>
        <MarkdownBody text={content} />
      </Component>
    );
  }
  return <Component {...props} />;
}

/**
 * Ensure a MathBlock's content is wrapped in `$$...$$` so remark-math /
 * rehype-katex actually renders it as KaTeX. Returns null when the
 * content is empty (no math to render).
 *
 * Handles three input shapes the model commonly produces:
 *   1. Raw LaTeX without delimiters → wrap in $$...$$
 *   2. Already wrapped in $$...$$ → leave as-is
 *   3. AMS-LaTeX delimiters \[...\] / \(...\) → normalize first, then wrap
 */
function wrapAsDisplayMath(content: string): string | null {
  if (!content) return null;
  // Step 1: normalize AMS-LaTeX delimiters, in case the model wrote
  // \[ ... \] inside the MathBlock content.
  let s = normalizeLatexDelimiters(content).trim();
  if (s.length === 0) return null;
  // Step 2: if already wrapped in $$...$$, pass through.
  if (s.startsWith("$$") && s.endsWith("$$") && s.length > 4) return s;
  // Step 3: strip a stray inline-$ wrapper (model used inline-math syntax
  // for what's clearly meant to be a display block).
  if (
    s.startsWith("$") &&
    s.endsWith("$") &&
    !s.startsWith("$$") &&
    !s.endsWith("$$")
  ) {
    s = s.slice(1, -1).trim();
    if (s.length === 0) return null;
  }
  // Step 4: wrap in $$ ... $$ on its own lines so remark-math definitely
  // treats it as a display block.
  return `$$\n${s}\n$$`;
}

/**
 * Tolerant error boundary — if a widget render throws (bad args), show a
 * minimal "render failed" card instead of crashing the whole message.
 */
class WidgetErrorBoundary extends Component<
  { children: ReactNode; toolName: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <WidgetRenderError toolName={this.props.toolName} message={this.state.error.message} />;
    }
    return this.props.children;
  }
}

function WidgetRenderError({
  toolName,
  message,
  args,
}: {
  toolName: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any;
}) {
  return (
    <div
      className="border-2 my-4"
      style={{ borderColor: "#DC2626", backgroundColor: "rgba(220, 38, 38, 0.04)" }}
    >
      <div
        className="px-4 py-2 border-b-2 text-[10px] uppercase font-bold tracking-[0.15em]"
        style={{
          borderColor: "#DC2626",
          backgroundColor: "#DC2626",
          color: "#fff",
          fontFamily: "var(--font-mono)",
        }}
      >
        ✕ Widget render failed: {toolName}
      </div>
      <div
        className="px-4 py-3 text-[12px]"
        style={{ color: C.text, fontFamily: "var(--font-mono)" }}
      >
        {message}
        {args ? (
          <details className="mt-2" style={{ color: C.textMuted }}>
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider">
              Raw args
            </summary>
            <pre className="text-[10px] mt-1 overflow-auto max-h-40">
              {JSON.stringify(args, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}

export interface WidgetRendererProps {
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
}

/**
 * Top-level renderer dispatch. Decides composite vs simple, handles errors.
 *
 * Critical: the actual element construction (`expandComposite`/`renderSimple`)
 * runs synchronously during this component's render. If it throws, an inner
 * <WidgetErrorBoundary> wouldn't catch it because the boundary mounts only
 * AFTER render returns. So we wrap construction in a try/catch here and
 * fall back to a friendly error card.
 */
export function WidgetRenderer({ toolName, args }: WidgetRendererProps) {
  let element: ReactNode;
  try {
    if (COMPOSITE_WIDGET_NAMES.has(toolName)) {
      element = expandComposite(toolName, args);
    } else {
      element = renderSimple(toolName, args);
    }
  } catch (err) {
    return (
      <WidgetRenderError
        toolName={toolName}
        message={err instanceof Error ? err.message : String(err)}
        args={args}
      />
    );
  }

  if (!element) {
    return (
      <div
        className="border-2 my-4 px-4 py-3 text-[12px]"
        style={{
          borderColor: C.border,
          color: C.textMuted,
          fontFamily: "var(--font-mono)",
        }}
      >
        ◇ Widget <strong>{toolName}</strong> received no usable args.
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider">
            Raw args
          </summary>
          <pre className="text-[10px] mt-1 overflow-auto max-h-40">
            {JSON.stringify(args, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  // Wrap in error boundary too so any errors thrown by child widget components
  // (e.g. graph eval failure) are caught at runtime.
  return (
    <WidgetErrorBoundary toolName={toolName}>{element}</WidgetErrorBoundary>
  );
}

export { renderSimple, expandComposite };
