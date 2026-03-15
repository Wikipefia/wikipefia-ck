import { Parser } from "expr-eval";

const parser = new Parser();

const cache = new Map<string, ReturnType<typeof parser.parse>>();

function getParsed(expr: string) {
  let parsed = cache.get(expr);
  if (!parsed) {
    parsed = parser.parse(expr);
    cache.set(expr, parsed);
  }
  return parsed;
}

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
