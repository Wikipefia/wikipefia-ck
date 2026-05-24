/**
 * remark-validate-components — Custom remark plugin that validates
 * JSX component usage in MDX against the component registry.
 *
 * Catches:
 *   - Unknown component names (typos like <Quizz>)
 *   - Missing required props (<Question> without text)
 *   - Invalid enum prop values (<Callout type="oops">)
 *   - Nesting violations (<Option> outside <Question>)
 */

import { visit, SKIP } from "unist-util-visit";
import {
  componentRegistry,
  knownComponentNames,
  type ComponentContract,
} from "../components/registry.js";

export interface ComponentDiagnostic {
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
}

/**
 * Check if a node name refers to a custom component (PascalCase).
 * Lowercase names are HTML elements; we only validate PascalCase components.
 */
function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

/**
 * Extract JSX attribute value from an MDX AST attribute node.
 */
function getAttrValue(
  attr: { type: string; name?: string; value?: unknown }
): string | boolean | number | null {
  if (attr.value === null || attr.value === undefined) {
    // Boolean attribute like `correct` (no value) = true
    return true;
  }
  if (typeof attr.value === "string") {
    return attr.value;
  }
  // Expression attribute like `correct={true}` or `width={800}`
  if (
    typeof attr.value === "object" &&
    attr.value !== null &&
    "value" in (attr.value as Record<string, unknown>)
  ) {
    return (attr.value as { value: unknown }).value as string | number | boolean;
  }
  return null;
}

/**
 * Create the remark plugin. Returns diagnostics through a callback
 * so the caller can collect them without interrupting compilation.
 */
export function remarkValidateComponents(
  options: { onDiagnostic?: (d: ComponentDiagnostic) => void } = {}
) {
  const { onDiagnostic } = options;

  function report(d: ComponentDiagnostic) {
    onDiagnostic?.(d);
  }

  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tree: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visit(tree, (node: any, _index: any, parent: any) => {
          const type = node.type as string;

          // We're interested in mdxJsxFlowElement and mdxJsxTextElement
          if (
            type !== "mdxJsxFlowElement" &&
            type !== "mdxJsxTextElement"
          ) {
            return;
          }

          const name = node.name as string | null;
          if (!name || !isComponentName(name)) {
            return;
          }

          const pos = node.position as
            | { start: { line: number; column: number } }
            | undefined;
          const line = pos?.start.line;
          const column = pos?.start.column;

          // 1. Check if component is known
          if (!knownComponentNames.has(name)) {
            report({
              message: `Unknown component <${name}>. Known components: ${[...knownComponentNames].join(", ")}`,
              line,
              column,
              severity: "error",
            });
            return;
          }

          const contract = componentRegistry[name] as ComponentContract;
          const attrs = (node.attributes || []) as Array<{
            type: string;
            name?: string;
            value?: unknown;
          }>;

          // Build a map of provided attributes
          const providedProps = new Map<string, unknown>();
          for (const attr of attrs) {
            if (attr.type === "mdxJsxAttribute" && attr.name) {
              providedProps.set(attr.name, getAttrValue(attr));
            }
          }

          // 2. Check required props
          for (const [propName, propContract] of Object.entries(
            contract.props
          )) {
            if (propContract.required && !providedProps.has(propName)) {
              report({
                message: `<${name}> is missing required prop "${propName}"`,
                line,
                column,
                severity: "error",
              });
            }
          }

          // 3. Check enum values
          for (const [propName, propContract] of Object.entries(
            contract.props
          )) {
            if (propContract.enum && providedProps.has(propName)) {
              const value = providedProps.get(propName);
              if (
                typeof value === "string" &&
                !propContract.enum.includes(value)
              ) {
                report({
                  message: `<${name}> prop "${propName}" has invalid value "${value}". Allowed: ${propContract.enum.join(", ")}`,
                  line,
                  column,
                  severity: "error",
                });
              }
            }
          }

          // 4. Check unknown props (warning, not error)
          for (const propName of providedProps.keys()) {
            if (!(propName in contract.props)) {
              report({
                message: `<${name}> has unknown prop "${propName}"`,
                line,
                column,
                severity: "warning",
              });
            }
          }

          // 5. Check nesting (parent constraint)
          if (contract.parent) {
            // Walk up the parent chain to find the expected parent
            const parentName = findParentComponentName(
              parent as Record<string, unknown> | null
            );
            if (parentName !== contract.parent) {
              report({
                message: `<${name}> must be a child of <${contract.parent}>, but found inside ${parentName ? `<${parentName}>` : "root"}`,
                line,
                column,
                severity: "error",
              });
            }
          }
        }
      );
    };
  };
}

/**
 * Walk up the tree to find the nearest parent that is a custom component.
 */
function findParentComponentName(
  node: Record<string, unknown> | null
): string | null {
  // The mdx AST doesn't provide a direct parent chain in visit,
  // but unist-util-visit does pass the parent node.
  if (!node) return null;

  const type = node.type as string;
  if (
    (type === "mdxJsxFlowElement" || type === "mdxJsxTextElement") &&
    typeof node.name === "string" &&
    isComponentName(node.name)
  ) {
    return node.name;
  }

  return null;
}
