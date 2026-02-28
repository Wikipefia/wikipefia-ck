import type { MDXComponents } from "mdx/types";
import { C } from "@/lib/theme";
import {
  Callout,
  Tabs,
  Tab,
  Collapse,
  Definition,
  createStubBlock,
  createStubInline,
} from "@/components/mdx";

export const mdxComponents: MDXComponents = {
  Callout,
  Tabs,
  Tab,
  Collapse,
  Definition,

  Quiz: createStubBlock("Quiz"),
  Question: createStubBlock("Question"),
  Option: createStubBlock("Option"),
  CodePlayground: createStubBlock("CodePlayground"),
  Figure: createStubBlock("Figure"),
  MathBlock: createStubBlock("MathBlock"),

  Graph: createStubBlock("Graph"),
  Plot: createStubInline("Plot"),
  Slider: createStubBlock("Slider"),
  Point: createStubInline("Point"),
  HLine: createStubInline("HLine"),
  VLine: createStubInline("VLine"),
  Area: createStubInline("Area"),
  Segment: createStubInline("Segment"),
  Interactive: createStubBlock("Interactive"),
  Value: createStubInline("Value"),
  Toggle: createStubInline("Toggle"),

  Timeline: createStubBlock("Timeline"),
  TimelineEvent: createStubBlock("TimelineEvent"),
  DataTable: createStubBlock("DataTable"),
  Comparison: createStubBlock("Comparison"),
  ComparisonItem: createStubBlock("ComparisonItem"),
  StepByStep: createStubBlock("StepByStep"),
  Step: createStubBlock("Step"),

  FlowDiagram: createStubBlock("FlowDiagram"),
  FlowNode: createStubInline("FlowNode"),
  FlowArrow: createStubInline("FlowArrow"),
  CycleDiagram: createStubBlock("CycleDiagram"),
  CycleNode: createStubInline("CycleNode"),
  BarChart: createStubBlock("BarChart"),
  Bar: createStubInline("Bar"),
  Diagram: createStubBlock("Diagram"),
  DBox: createStubInline("DBox"),
  DCircle: createStubInline("DCircle"),
  DArrow: createStubInline("DArrow"),
  DLabel: createStubInline("DLabel"),

  h1: ({ children, id, ...props }) => (
    <h1
      id={id}
      className="text-3xl md:text-4xl font-bold uppercase mb-6 scroll-mt-24 tracking-tighter"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, id, ...props }) => (
    <h2
      id={id}
      className="text-2xl font-bold uppercase mt-10 mb-4 scroll-mt-20"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, id, ...props }) => (
    <h3
      id={id}
      className="text-lg font-bold uppercase mt-8 mb-3 scroll-mt-20"
      style={{ color: C.text }}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, id, ...props }) => (
    <h4
      id={id}
      className="text-base font-bold uppercase mt-6 mb-2 scroll-mt-20"
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p
      className="text-[16px] leading-[1.85] mb-5"
      style={{ color: C.text, fontFamily: "var(--font-mono)" }}
      {...props}
    >
      {children}
    </p>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="overflow-x-auto rounded-none border mb-6 text-sm leading-relaxed"
      style={{ backgroundColor: C.bg, borderColor: C.borderLight }}
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }) => {
    if (!className) {
      return (
        <code
          className="px-1.5 py-0.5 text-[14px] font-mono border"
          style={{
            backgroundColor: C.bg,
            borderColor: C.borderLight,
            color: C.text,
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`${className} block px-4 py-3`} {...props}>
        {children}
      </code>
    );
  },
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      className="underline underline-offset-2 decoration-1 hover:decoration-2 transition-all"
      style={{ color: C.accent, textDecorationColor: C.borderLight }}
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-6 space-y-2 ml-4 list-none" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-6 space-y-2 ml-4 list-none" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li
      className="text-[15px] leading-[1.75] pl-3"
      style={{
        color: C.text,
        fontFamily: "var(--font-mono)",
        borderLeft: `2px solid ${C.borderLight}`,
      }}
      {...props}
    >
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 px-4 py-3 mb-6 text-[14px] leading-[1.75]"
      style={{
        borderLeftColor: C.borderLight,
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        color: C.textMuted,
        fontFamily: "var(--font-mono)",
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <div
      className="overflow-x-auto mb-6 border"
      style={{ borderColor: C.borderLight }}
    >
      <table className="w-full text-[14px]" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead
      className="text-[11px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: C.headerBg, color: C.headerText }}
      {...props}
    >
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-3 py-2 text-left" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="px-3 py-2 border-t"
      style={{ borderColor: C.borderLight, color: C.text }}
      {...props}
    >
      {children}
    </td>
  ),
  hr: () => (
    <hr
      className="my-8"
      style={{ borderColor: C.borderLight, borderStyle: "dashed" }}
    />
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-bold" style={{ color: C.text }} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
};
