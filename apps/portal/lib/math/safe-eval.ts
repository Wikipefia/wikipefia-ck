import { Parser } from "expr-eval";

/**
 * Safe math expression evaluator.
 *
 * Uses expr-eval — a proper tokenizer/parser that ONLY understands math.
 * No eval(), no Function(), no access to JS runtime objects.
 *
 * Supported:
 *   Arithmetic: + - * / ^ %
 *   Comparison: < > <= >= == !=
 *   Logical:    and or not
 *   Ternary:    condition ? a : b
 *   Functions:  sin cos tan asin acos atan sqrt abs ceil floor round
 *               log log2 log10 exp pow min max sign trunc
 *   Constants:  PI E
 *   Variables:  any name (x, a, b, price, quantity, ...)
 */

const parser = new Parser();

/** Cache parsed expressions to avoid re-parsing on every slider tick. */
const cache = new Map<string, ReturnType<typeof parser.parse>>();

function getParsed(expr: string) {
  let parsed = cache.get(expr);
  if (!parsed) {
    parsed = parser.parse(expr);
    cache.set(expr, parsed);
  }
  return parsed;
}

/**
 * Evaluate a math expression with the given variable bindings.
 * Returns NaN on any error (division by zero, undefined variable, etc.).
 */
export function safeEval(
  expr: string,
  vars: Record<string, number>
): number {
  try {
    const result = getParsed(expr).evaluate(vars);
    return typeof result === "number" ? result : NaN;
  } catch {
    return NaN;
  }
}
