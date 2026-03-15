/**
 * Content loader — reads pre-compiled content from .content-build at runtime.
 */

import { readFile } from "fs/promises";
import path from "path";
import type { ContentManifest, TocEntry, SearchMeta } from "./types";

const BUILD_DIR = path.join(process.cwd(), ".content-build");
let cachedManifest: ContentManifest | null = null;

export async function getManifest(): Promise<ContentManifest> {
  if (cachedManifest) return cachedManifest;
  const raw = await readFile(path.join(BUILD_DIR, "manifest.json"), "utf-8");
  cachedManifest = JSON.parse(raw);
  return cachedManifest!;
}

export async function getCompiledMDX(
  compiledPathTemplate: string,
  locale: string
): Promise<string> {
  const compiledPath = compiledPathTemplate.replace("{locale}", locale);
  return readFile(path.join(BUILD_DIR, compiledPath), "utf-8");
}

export async function getTableOfContents(
  tocPathTemplate: string,
  locale: string
): Promise<TocEntry[]> {
  const tocPath = tocPathTemplate.replace("{locale}", locale);
  const raw = await readFile(path.join(BUILD_DIR, tocPath), "utf-8");
  return JSON.parse(raw);
}

export async function getSearchMeta(): Promise<SearchMeta> {
  const raw = await readFile(
    path.join(BUILD_DIR, "search-meta.json"),
    "utf-8"
  );
  return JSON.parse(raw);
}
