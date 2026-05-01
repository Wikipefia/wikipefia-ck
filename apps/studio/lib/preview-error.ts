/**
 * Live-preview error model + extractor.
 *
 * The studio compiles every keystroke through three stages:
 *
 *   1. Compile  — `compileMDX` turns MDX into a JS function body.
 *   2. Evaluate — `run()` from @mdx-js/mdx executes that function body
 *                 and returns the React component.
 *   3. Render   — React calls the component; user JSX expressions run
 *                 inside the React render tree.
 *
 * Each stage can fail. This module normalizes all three into a single
 * `PreviewError` shape and provides best-effort source-location
 * extraction so the editor can highlight the offending line.
 *
 * The extractor is *deliberately generic*. It does not know about any
 * specific component or error pattern — it parses positions from the
 * standard places JS runtimes record them: `Error#stack`,
 * `ErrorInfo#componentStack`, and `_jsxDEV` source annotations baked
 * into the compiled output by `development: true`.
 */

export type PreviewErrorStage = "compile" | "evaluate" | "render";

export interface PreviewErrorLocation {
  /** 1-indexed line in the user's editor (frontmatter included). */
  line: number;
  /** 1-indexed column, or undefined when only the line is known. */
  column?: number;
}

export interface PreviewError {
  stage: PreviewErrorStage;
  /** Short human-readable label like "i is not defined". */
  message: string;
  /** Underlying Error.name when known (e.g. "ReferenceError"). */
  name?: string;
  /** Best-effort original location in the editor's coordinate system. */
  location?: PreviewErrorLocation;
  /** Raw stack — kept for the "Details" disclosure. */
  stack?: string;
  /** React component stack from the error boundary, when applicable. */
  componentStack?: string;
}

/**
 * Pull positions tagged with `virtualPath` out of any string. Handles
 * the two formats Chromium / Firefox / Safari / Node use in stacks and
 * the one React uses in `componentStack`:
 *
 *   • `at Foo (studio-editor.mdx:12:34)`            (V8 / componentStack)
 *   • `Foo@studio-editor.mdx:12:34`                  (Spidermonkey)
 *   • `at studio-editor.mdx:12:34`                   (anonymous V8 frame)
 */
function extractPositions(
  text: string,
  virtualPath: string,
): Array<{ line: number; column: number }> {
  const escapedPath = virtualPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Capture line:col anywhere virtualPath appears.
  const re = new RegExp(`${escapedPath}:(\\d+):(\\d+)`, "g");
  const out: Array<{ line: number; column: number }> = [];
  for (const m of text.matchAll(re)) {
    const line = Number(m[1]);
    const column = Number(m[2]);
    if (Number.isFinite(line) && Number.isFinite(column)) {
      out.push({ line, column });
    }
  }
  return out;
}

/**
 * When `development: true`, every `_jsxDEV(C, props, key, isStatic,
 * {fileName, lineNumber, columnNumber}, this)` call in the compiled
 * output carries an inline source-position literal — placed *after*
 * `props` in the call's argument list.
 *
 * This means: if a runtime error fires while evaluating one of the
 * arguments (a child expression like `{i}`), the throw position in
 * the compiled JS is *before* the call's source literal. The first
 * `lineNumber: N, columnNumber: C` we encounter scanning *forward*
 * is therefore the enclosing JSX call's source — and that's the
 * MDX-source position we want to surface.
 *
 * If no forward match exists (rare — it'd mean the error fires after
 * the last JSX site), we fall back to the most recent literal
 * scanning backwards.
 */
function findNearestEmbeddedPosition(
  compiled: string,
  generatedLine: number,
  generatedColumn: number,
): { line: number; column: number } | null {
  // Convert (line, col) into a flat string offset.
  const lines = compiled.split("\n");
  if (generatedLine <= 0 || generatedLine > lines.length) return null;
  let offset = 0;
  for (let i = 0; i < generatedLine - 1; i++) offset += lines[i].length + 1;
  offset += Math.max(0, generatedColumn - 1);

  const re = /lineNumber:\s*(\d+),\s*columnNumber:\s*(\d+)/g;

  // Forward scan first — the enclosing `_jsxDEV` call's source object.
  re.lastIndex = offset;
  const forward = re.exec(compiled);
  if (forward) {
    return { line: Number(forward[1]), column: Number(forward[2]) };
  }

  // Backward fallback — last occurrence in the prefix.
  re.lastIndex = 0;
  let last: { line: number; column: number } | null = null;
  for (const m of compiled.slice(0, offset).matchAll(re)) {
    last = { line: Number(m[1]), column: Number(m[2]) };
  }
  return last;
}

/**
 * Parse positions from a Chrome-style anonymous-eval frame:
 *   `at eval (eval at run (...), <anonymous>:LINE:COL)`
 * or the bare form `at <anonymous>:LINE:COL`.
 *
 * The compiled MDX runs through `new AsyncFunction(...)` inside
 * `run()`, so its frames don't carry `virtualPath` — they appear as
 * `<anonymous>` instead. We use these to drive
 * `findNearestEmbeddedPosition` against the compiled source.
 */
function extractAnonymousFramePositions(
  stack: string,
): Array<{ line: number; column: number }> {
  const out: Array<{ line: number; column: number }> = [];
  for (const m of stack.matchAll(/<anonymous>:(\d+):(\d+)/g)) {
    out.push({ line: Number(m[1]), column: Number(m[2]) });
  }
  return out;
}

export interface ExtractContext {
  /** The compiled JS function body — searched for embedded source positions. */
  compiled?: string | null;
  /** Virtual path the compiler used as `fileName` (e.g. "studio-editor.mdx"). */
  virtualPath?: string | null;
  /** Lines stripped as frontmatter before compilation. */
  frontmatterLines?: number | null;
  /** React Error Boundary's componentStack, when a render error. */
  componentStack?: string | null;
}

/**
 * Given an unknown thrown value (typed as `unknown` per the catch-clause
 * convention) and some context about the most recent compile, return a
 * normalized `PreviewError`.
 *
 * The function never throws — every code path produces a usable
 * `PreviewError`, even if it's only a string message.
 */
export function toPreviewError(
  err: unknown,
  stage: PreviewErrorStage,
  ctx: ExtractContext = {},
): PreviewError {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : (() => {
            try {
              return JSON.stringify(err);
            } catch {
              return String(err);
            }
          })();

  const name = err instanceof Error ? err.name : undefined;
  const stack = err instanceof Error ? err.stack : undefined;
  const componentStack = ctx.componentStack ?? undefined;

  const location = locateError({
    message,
    stack,
    componentStack,
    compiled: ctx.compiled ?? null,
    virtualPath: ctx.virtualPath ?? null,
    frontmatterLines: ctx.frontmatterLines ?? 0,
  });

  return { stage, message, name, location, stack, componentStack };
}

interface LocateInput {
  message: string;
  stack?: string;
  componentStack?: string;
  compiled: string | null;
  virtualPath: string | null;
  frontmatterLines: number;
}

/**
 * Resolve the error to a `{line, column}` in editor coordinates. The
 * resolver tries several signals in priority order and returns the
 * first one that yields a position; if none match, returns undefined.
 */
function locateError(input: LocateInput): PreviewErrorLocation | undefined {
  const { stack, componentStack, compiled, virtualPath, frontmatterLines } =
    input;

  const offset = (line: number): number => line + (frontmatterLines || 0);

  // 1. componentStack — most reliable when the error is thrown inside
  //    a child component's render. React 19 with the dev runtime puts
  //    `at Foo (virtualPath:line:col)` for every JSX site in the tree.
  if (componentStack && virtualPath) {
    const positions = extractPositions(componentStack, virtualPath);
    // First (innermost) entry is the closest component to the throw.
    if (positions.length > 0) {
      return { line: offset(positions[0].line), column: positions[0].column };
    }
  }

  // 2. error.stack with the virtualPath baked in — happens when
  //    Node/V8 surfaces the embedded `_jsxDEV` source object in the
  //    stack frame description for synchronous JSX construction.
  if (stack && virtualPath) {
    const positions = extractPositions(stack, virtualPath);
    if (positions.length > 0) {
      return { line: offset(positions[0].line), column: positions[0].column };
    }
  }

  // 3. error.stack with `<anonymous>` frames — V8's stack inside the
  //    AsyncFunction `run()` builds. We use the generated position to
  //    find the most recent embedded `_jsxDEV` source object in the
  //    compiled JS, which corresponds to the JSX call we were
  //    constructing when the throw happened.
  if (stack && compiled) {
    const generated = extractAnonymousFramePositions(stack);
    for (const pos of generated) {
      const original = findNearestEmbeddedPosition(
        compiled,
        pos.line,
        pos.column,
      );
      if (original) {
        return {
          line: offset(original.line),
          column: original.column,
        };
      }
    }
  }

  return undefined;
}
