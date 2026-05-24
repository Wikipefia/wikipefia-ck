/**
 * MDX Renderer — Server-side rendering of pre-compiled MDX.
 *
 * Uses @mdx-js/mdx run() to evaluate pre-compiled function bodies.
 */

import { run } from "@mdx-js/mdx";
import * as jsxRuntime from "react/jsx-runtime";
import { mdxComponents } from "./components";

interface MDXRendererProps {
  compiledSource: string;
}

export async function MDXRenderer({ compiledSource }: MDXRendererProps) {
  const { default: MDXContent } = await run(compiledSource, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
  });

  return <MDXContent components={mdxComponents} />;
}
