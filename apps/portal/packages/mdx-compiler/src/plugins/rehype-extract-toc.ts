/**
 * rehype-extract-toc — Custom rehype plugin that extracts
 * a table of contents from heading elements.
 *
 * Collects all h1–h6 elements with their id, text, and depth.
 */

import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";

export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

/**
 * Create a rehype plugin that extracts ToC entries into the provided array.
 * The caller passes a mutable array that gets populated during processing.
 */
export function rehypeExtractToc(tocStore: TocEntry[]) {
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tree: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visit(tree, "element", (node: any) => {
        const tagName = node.tagName as string;
        if (/^h[1-6]$/.test(tagName)) {
          tocStore.push({
            id: node.properties?.id || "",
            text: toString(node),
            depth: parseInt(tagName[1]),
          });
        }
      });
    };
  };
}
