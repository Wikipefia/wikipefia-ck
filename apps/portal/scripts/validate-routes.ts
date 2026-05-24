#!/usr/bin/env tsx
/**
 * validate-routes.ts — Standalone route validation script.
 *
 * Checks global slug uniqueness across all entity types.
 * Run: pnpm content:validate
 */

import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const RESERVED_SLUGS = ["api", "_next", "not-found", "search"];

async function main() {
  console.log("\n▸ Validating routes (flat namespace)...\n");

  const errors: string[] = [];
  const slugRegistry = new Map<string, { type: string; source: string }>();

  function registerSlug(slug: string, type: string, source: string) {
    if (RESERVED_SLUGS.includes(slug)) {
      errors.push(
        `RESERVED: ${type} "${slug}" uses reserved slug. Source: ${source}`
      );
      return;
    }
    const existing = slugRegistry.get(slug);
    if (existing) {
      errors.push(
        `COLLISION: "${slug}" claimed by ${existing.type} (${existing.source}) AND ${type} (${source})`
      );
      return;
    }
    slugRegistry.set(slug, { type, source });
  }

  // Subjects
  const subjectsDir = path.join(CONTENT_DIR, "subjects");
  if (existsSync(subjectsDir)) {
    const dirs = await readdir(subjectsDir, { withFileTypes: true });
    for (const d of dirs.filter((d) => d.isDirectory())) {
      const configPath = path.join(subjectsDir, d.name, "config.json");
      if (!existsSync(configPath)) continue;
      const config = JSON.parse(await readFile(configPath, "utf-8"));
      registerSlug(
        config.slug || d.name,
        "Subject",
        `content/subjects/${d.name}`
      );
    }
  }

  // Teachers
  const teachersDir = path.join(CONTENT_DIR, "teachers");
  if (existsSync(teachersDir)) {
    const dirs = await readdir(teachersDir, { withFileTypes: true });
    for (const d of dirs.filter((d) => d.isDirectory())) {
      const configPath = path.join(teachersDir, d.name, "config.json");
      if (!existsSync(configPath)) continue;
      const config = JSON.parse(await readFile(configPath, "utf-8"));
      registerSlug(
        config.slug || d.name,
        "Teacher",
        `content/teachers/${d.name}`
      );
    }
  }

  // System
  const systemConfigPath = path.join(CONTENT_DIR, "system", "config.json");
  if (existsSync(systemConfigPath)) {
    const config = JSON.parse(await readFile(systemConfigPath, "utf-8"));
    for (const article of config.articles || []) {
      registerSlug(article.slug, "System Article", "content/system");
    }
  }

  if (errors.length > 0) {
    console.error("ROUTE VALIDATION FAILED:\n");
    errors.forEach((e, i) => console.error(`  [${i + 1}] ${e}`));
    console.error(`\nTotal errors: ${errors.length}`);
    process.exit(1);
  }

  console.log(
    `✓ Route validation passed. ${slugRegistry.size} unique slugs registered.\n`
  );
  for (const [slug, info] of slugRegistry) {
    console.log(`  ${slug} → ${info.type}`);
  }
  console.log();
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
