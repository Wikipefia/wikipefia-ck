import { z } from "zod";
import type { PropContract } from "@wikipefia/mdx-renderer/registry";

/**
 * Convert a single PropContract from the mdx-renderer registry into a Zod schema.
 *
 * Handles the four contract shapes:
 *   - { enum: [...] }    → z.enum(...)
 *   - { type: "string" } → z.string()
 *   - { type: "number" } → z.number()
 *   - { type: "boolean" }→ z.boolean()
 *   - {}                 → z.unknown() (used by complex props like xDomain: [number, number])
 *
 * Required vs optional is applied by the caller (build-tools.ts) — this function
 * always returns the bare schema.
 */
export function zodFromContract(contract: PropContract): z.ZodTypeAny {
  if (contract.enum && contract.enum.length > 0) {
    return z.enum(contract.enum as [string, ...string[]]);
  }
  switch (contract.type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    default:
      return z.unknown();
  }
}

/**
 * Build a flat object schema from a registry PropContract record.
 * Optional contracts are wrapped with `.optional()`.
 */
export function zodObjectFromProps(
  props: Record<string, PropContract>,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, contract] of Object.entries(props)) {
    let s = zodFromContract(contract);
    if (!contract.required) s = s.optional();
    shape[key] = s;
  }
  return z.object(shape);
}
