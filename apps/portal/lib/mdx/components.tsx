/**
 * Custom MDX component map — built from @wikipefia/mdx-renderer (single source of truth).
 * No need to list components individually; componentMap has them all.
 */

import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { componentMap, createTypography } from "@wikipefia/mdx-renderer";

const typography = createTypography({ Link });

export const mdxComponents: MDXComponents = {
  ...componentMap,
  ...typography,
};
