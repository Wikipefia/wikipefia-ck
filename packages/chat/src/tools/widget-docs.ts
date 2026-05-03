/**
 * Verbose, model-facing documentation for each widget.
 *
 * The agent's tool list registers ~22 widget tools, but each has only a one-line
 * description to keep token usage low. When the model needs full prop docs and
 * usage examples it calls `lookupWidgetDocs(widgetName)` which returns the entry
 * here AND unlocks the widget in subsequent `activeTools`.
 */

export interface WidgetDoc {
  description: string;
  /** When to use this widget vs alternatives. */
  guidance: string;
  /** Concrete usage examples written as JSON for AI clarity. */
  examples: string;
}

export const WIDGET_DOCS: Record<string, WidgetDoc> = {
  Callout: {
    description:
      "Highlighted notice box. Three styles: info (blue), warning (amber), error (red).",
    guidance:
      "Use for asides, tips, important warnings, or errors. Don't overuse — at most one or two per answer. Pick `type` based on the urgency.",
    examples: `{ "type": "info", "content": "Note that gradient descent requires the function to be differentiable." }`,
  },

  Definition: {
    description: "Boxed term definition with a labeled header.",
    guidance:
      "Use when introducing a NEW technical term that the user needs to remember. The `term` is shown prominently; the `content` is the definition.",
    examples: `{ "term": "Eigenvalue", "content": "A scalar λ such that Av = λv for some non-zero vector v." }`,
  },

  Collapse: {
    description: "Expandable section, hidden by default.",
    guidance:
      "Use for tangential detail (proofs, optional context, advanced notes) that shouldn't clutter the main flow but is valuable for curious readers.",
    examples: `{ "title": "Why this works", "content": "The key insight is..." }`,
  },

  Quiz: {
    description:
      "INTERACTIVE multiple-choice quiz. Generation pauses; user answers; you receive answers as a tool result and must explain.",
    guidance:
      "Use whenever the user asks for a quiz, or when checking comprehension would help learning. Each question MUST have 2–4 options with EXACTLY ONE correct. Avoid joke options. Add `explanation` per option when the misconception is interesting. " +
      "Question text, option values, AND explanations all support inline markdown + LaTeX — use $...$ for inline math (e.g. \"$\\\\frac{d}{dx}\\\\sin(x)$\"), **bold**, *italic*, etc. ALWAYS write math expressions inside $...$ rather than as plain ASCII (\"$P(X{=}2)$\" not \"P(X=2)\").",
    examples: `{ "questions": [
  { "text": "Чему равно $\\\\frac{d}{dx}\\\\sin(x)$?",
    "options": [
      { "value": "$\\\\cos(x)$", "correct": true, "explanation": "Прямое применение табличной производной." },
      { "value": "$-\\\\cos(x)$", "correct": false, "explanation": "Ошибка в знаке — это производная $-\\\\sin(x)$." },
      { "value": "$\\\\tan(x)$", "correct": false }
    ]
  },
  { "text": "Для $X \\\\sim \\\\mathrm{Bin}(3, 0.1)$, чему равно $P(X{=}2)$?",
    "options": [
      { "value": "$0.1^2 \\\\cdot 0.9 = 0.009$", "correct": false, "explanation": "Забыт биномиальный коэффициент $\\\\binom{3}{2}=3$." },
      { "value": "$3 \\\\cdot 0.1^2 \\\\cdot 0.9 = 0.027$", "correct": true, "explanation": "Формула Бернулли $\\\\binom{n}{k} p^k (1{-}p)^{n-k}$." },
      { "value": "$0.1^3 = 0.001$", "correct": false, "explanation": "Это $P(X{=}3)$." }
    ]
  }
] }`,
  },

  DataTable: {
    description: "Structured tabular data with optional sorting.",
    guidance:
      "Use for comparing 3+ rows of structured data. Columns is an array of header strings. Rows is an array of arrays of cell strings (must match columns length). " +
      "Cells AND column headers support inline markdown and LaTeX: write **bold**, `code`, [links](url), and inline math with $...$ (e.g. \"$P(X{=}k) = \\\\binom{n}{k}p^k$\"). Use $...$ rather than writing math as plain ASCII.",
    examples: `{ "caption": "$P(X{=}k)$ for $n{=}3$, $p{=}0.1$", "columns": ["$k$", "Meaning", "$P(X{=}k)$"], "rows": [
  ["0", "no defects", "$0.9^3 = 0.729$"],
  ["1", "exactly one defect", "$3 \\\\cdot 0.1 \\\\cdot 0.9^2 = 0.243$"],
  ["2", "exactly two defects", "$3 \\\\cdot 0.1^2 \\\\cdot 0.9 = 0.027$"],
  ["3", "three defects", "$0.1^3 = 0.001$"]
] }`,
  },

  Figure: {
    description: "Image with caption.",
    guidance:
      "Use only when you have a real image URL. Don't invent URLs. Always provide `alt` for accessibility.",
    examples: `{ "src": "https://example.com/diagram.png", "alt": "Phase diagram of water", "caption": "Phase boundaries between solid, liquid, and gas." }`,
  },

  MathBlock: {
    description: "Multi-line LaTeX math expression rendered with KaTeX.",
    guidance:
      "Use for displayed equations with multiple lines or complex layouts (matrices, derivations). For one-line equations prefer inline `$...$` in markdown.",
    examples: `{ "content": "\\\\begin{aligned}\\\\nabla \\\\cdot \\\\vec E &= \\\\frac{\\\\rho}{\\\\varepsilon_0} \\\\\\\\ \\\\nabla \\\\cdot \\\\vec B &= 0 \\\\end{aligned}" }`,
  },

  BarChart: {
    description: "Bar chart of labeled numeric values.",
    guidance:
      "Use for comparing 3–10 quantities. Choose horizontal orientation when labels are long.",
    examples: `{ "title": "GDP per capita (2024)", "orientation": "horizontal", "showValues": true, "bars": [
  { "label": "Switzerland", "value": 92000 },
  { "label": "USA", "value": 80000 },
  { "label": "Germany", "value": 52000 }
] }`,
  },

  Timeline: {
    description: "Chronological list of events.",
    guidance:
      "Use for historical sequences with dates. `date` is shown as a label — any string works ('2024', 'Jan 2020', '500 BC').",
    examples: `{ "title": "Quantum Mechanics", "events": [
  { "date": "1900", "title": "Planck's quantum hypothesis", "description": "Energy quantized in discrete packets." },
  { "date": "1905", "title": "Einstein explains photoelectric effect" },
  { "date": "1925", "title": "Heisenberg's matrix mechanics" }
] }`,
  },

  StepByStep: {
    description: "Numbered procedure or guide.",
    guidance:
      "Use for procedural instructions where ORDER matters. Each step has a short title and markdown body.",
    examples: `{ "title": "Solving 2x² + 3x - 5 = 0", "steps": [
  { "title": "Identify coefficients", "content": "a=2, b=3, c=-5." },
  { "title": "Apply quadratic formula", "content": "x = (-b ± √(b² - 4ac)) / 2a" }
] }`,
  },

  Tabs: {
    description: "Tabbed content sections.",
    guidance:
      "Use when you have 2–5 alternative views of related content (e.g. languages, levels of detail). Avoid for sequential content.",
    examples: `{ "tabs": [
  { "label": "Python", "content": "\`\`\`python\\nprint('hi')\\n\`\`\`" },
  { "label": "JS", "content": "\`\`\`js\\nconsole.log('hi');\\n\`\`\`" }
] }`,
  },

  Comparison: {
    description: "Side-by-side comparison of 2–4 items.",
    guidance:
      "Use when contrasting alternatives. Each item gets a title and markdown content. Optional `color` per item.",
    examples: `{ "title": "Stack vs Queue", "items": [
  { "title": "Stack", "content": "**LIFO**. Push/pop from one end." },
  { "title": "Queue", "content": "**FIFO**. Enqueue at back, dequeue from front." }
] }`,
  },

  CodePlayground: {
    description: "Editable, runnable code block.",
    guidance:
      "Use only for interactive demos where the user might edit and re-run. For read-only examples use a fenced markdown code block instead.",
    examples: `{ "language": "javascript", "code": "function fib(n){ return n<2 ? n : fib(n-1)+fib(n-2); }\\nconsole.log(fib(10));" }`,
  },

  Interactive: {
    description: "Reactive sandbox with sliders/toggles and computed values.",
    guidance:
      "Use for parameter exploration. Each slider has a name; values are expressions that reference slider names (e.g. `expr: 'x * 2 + offset'` references sliders named x and offset).",
    examples: `{ "title": "Distance traveled", "sliders": [
  { "name": "v", "min": 0, "max": 100, "default": 30, "label": "Velocity (m/s)" },
  { "name": "t", "min": 0, "max": 60, "default": 10, "label": "Time (s)" }
], "values": [
  { "label": "Distance", "expr": "v * t", "suffix": " m", "decimals": 1 }
] }`,
  },

  Graph: {
    description: "2D coordinate graph with function plots and points.",
    guidance:
      "Use for plotting functions like x², sin(x), or marking individual points. `plots` are continuous curves; `points` are individual dots. Set `xMin/xMax/yMin/yMax` to control viewport.",
    examples: `{ "title": "Quadratic", "xMin": -5, "xMax": 5, "yMin": -2, "yMax": 25, "plots": [
  { "expr": "x^2", "label": "y = x²", "color": "#2563EB" }
], "points": [
  { "x": "0", "y": "0", "label": "Vertex" }
] }`,
  },

  FlowDiagram: {
    description: "Flowchart with named nodes and arrows between them.",
    guidance:
      "Use for processes where elements have IDs and connections matter. `direction` is horizontal or vertical. Arrows reference node IDs.",
    examples: `{ "title": "Compilation", "direction": "horizontal", "nodes": [
  { "id": "src", "label": "Source" },
  { "id": "ast", "label": "AST" },
  { "id": "ir", "label": "IR" },
  { "id": "asm", "label": "Assembly" }
], "arrows": [
  { "from": "src", "to": "ast", "label": "parse" },
  { "from": "ast", "to": "ir", "label": "lower" },
  { "from": "ir", "to": "asm", "label": "emit" }
] }`,
  },

  CycleDiagram: {
    description: "Circular cycle of 2+ ordered nodes.",
    guidance:
      "Use for cyclic processes (water cycle, biological cycles, ML training loops).",
    examples: `{ "title": "Water cycle", "clockwise": true, "nodes": [
  { "label": "Evaporation", "icon": "☀️" },
  { "label": "Condensation", "icon": "☁️" },
  { "label": "Precipitation", "icon": "🌧" },
  { "label": "Collection", "icon": "🌊" }
] }`,
  },

  Diagram: {
    description: "Low-level free-form diagram with absolute-positioned shapes.",
    guidance:
      "Use only when other diagram widgets don't fit (rare). Coordinates are in pixels with origin at top-left of the canvas.",
    examples: `{ "width": 400, "height": 200, "boxes": [
  { "x": 20, "y": 80, "w": 100, "h": 40, "label": "Input" },
  { "x": 280, "y": 80, "w": 100, "h": 40, "label": "Output" }
], "arrows": [
  { "from": "Input", "to": "Output", "label": "process" }
] }`,
  },

  QuestionBox: {
    description:
      "Inline 'ask a focused follow-up' anchor. Embedded mid-answer after a discrete subtopic; the user can click it later to ask about THAT subtopic specifically without disturbing the main thread.",
    guidance:
      "PLACEMENT is the whole point: place ONE QuestionBox right after each subtopic in a multi-subtopic answer. Not after every paragraph (over-fragmented). Not just at the end (the value is per-subtopic anchoring). Skip QuestionBoxes entirely in short single-topic answers — one box adds nothing. " +
      "TOPIC: write a SHORT (3–8 words) description of what subtopic this box is for, in the user's language. The user sees this as the box label, and the follow-up answerer uses it to scope its reply. Be specific — 'Dispersion vs standard deviation' beats 'Statistics'. " +
      "QuestionBox is ALWAYS callable — it doesn't require a lookupWidgetDocs call first. " +
      "Emitting QuestionBox does NOT pause your generation: keep writing the next subtopic right after.",
    examples: `One QuestionBox per subtopic, inline. Each call's args:
{ "topic": "Дискретные случайные величины" }
{ "topic": "Continuous random variables" }
{ "topic": "Probability density function" }`,
  },
};

/** Get the names of all widgets that have docs. */
export function getDocumentedWidgetNames(): string[] {
  return Object.keys(WIDGET_DOCS);
}
