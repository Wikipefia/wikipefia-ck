/**
 * Component registry — re-exported from @wikipefia/mdx-renderer (single source of truth).
 *
 * All component contracts, prop types, and nesting rules are defined in
 * @wikipefia/mdx-renderer/registry. This file re-exports them so existing
 * imports within mdx-compiler continue to work.
 */

export {
  componentRegistry,
  knownComponentNames,
  type ComponentContract,
  type ComponentEntry,
  type PropContract,
  type PropType,
  type CatalogMeta,
  type CatalogEntry,
  type Category,
  CATEGORY_META,
  catalogEntries,
} from "@wikipefia/mdx-renderer/registry";
