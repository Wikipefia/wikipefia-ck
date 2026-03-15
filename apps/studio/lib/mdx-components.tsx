/**
 * Studio MDX component map — built from @wikipefia/mdx-renderer (single source of truth).
 * No need to list components individually; componentMap has them all.
 */

import { componentMap, createTypography } from "@wikipefia/mdx-renderer";

const typography = createTypography();

export const mdxComponents = {
  ...componentMap,
  ...typography,
};
