#!/usr/bin/env node
/**
 * wikipefia-mdx — CLI for validating MDX content.
 *
 * Usage:
 *   wikipefia-mdx validate [dir]                   Validate all MDX in directory
 *   wikipefia-mdx validate [dir] --type subject     Subject repo (single subject)
 *   wikipefia-mdx validate [dir] --type teacher     Single teacher directory
 *   wikipefia-mdx validate [dir] --type teachers    Unified teachers repo (multiple teachers)
 *   wikipefia-mdx validate [dir] --type system      System articles repo
 *
 * Exit codes:
 *   0 = all valid (warnings are OK)
 *   1 = validation errors found
 *   2 = invalid arguments
 */

import path from "path";
import { existsSync } from "fs";
import { readFile, readdir, stat } from "fs/promises";
import { validateMDX } from "../validate.js";
import { SubjectConfig } from "../schemas/subject.js";
import { TeacherConfig } from "../schemas/teacher.js";
import { SystemConfig } from "../schemas/system.js";
import { LOCALES } from "../schemas/shared.js";

// ── Colors (minimal, no dependencies) ────────────────

const isColor = process.stdout.isTTY && !process.env.NO_COLOR;
const red = (s: string) => (isColor ? `\x1b[31m${s}\x1b[0m` : s);
const green = (s: string) => (isColor ? `\x1b[32m${s}\x1b[0m` : s);
const yellow = (s: string) => (isColor ? `\x1b[33m${s}\x1b[0m` : s);
const dim = (s: string) => (isColor ? `\x1b[2m${s}\x1b[0m` : s);
const bold = (s: string) => (isColor ? `\x1b[1m${s}\x1b[0m` : s);

// ── Types ────────────────────────────────────────────

type ContentType = "subject" | "teacher" | "teachers" | "system";

const VALID_TYPES: ContentType[] = ["subject", "teacher", "teachers", "system"];

// ── Argument parsing ─────────────────────────────────

function parseArgs(argv: string[]) {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    return { command: "help" as const };
  }

  const command = args[0];
  if (command !== "validate") {
    return { command: "unknown" as const, raw: command };
  }

  const dir = args[1] || ".";
  let type: ContentType | undefined;

  const typeIdx = args.indexOf("--type");
  if (typeIdx !== -1 && args[typeIdx + 1]) {
    const t = args[typeIdx + 1] as ContentType;
    if (VALID_TYPES.includes(t)) {
      type = t;
    } else {
      console.error(red(`Unknown content type: "${t}". Expected one of: ${VALID_TYPES.join(", ")}`));
      process.exit(2);
    }
  }

  return { command: "validate" as const, dir, type };
}

// ── Help ─────────────────────────────────────────────

function printHelp() {
  console.log(`
${bold("wikipefia-mdx")} — Validate MDX content for Wikipefia

${bold("USAGE")}
  wikipefia-mdx validate [dir] [--type <type>]

${bold("COMMANDS")}
  validate    Validate MDX files in the given directory

${bold("CONTENT TYPES")}
  subject     Single subject repo (config.json + articles/)
  teacher     Single teacher directory (config.json + articles/)
  teachers    Unified teachers repo (multiple teacher dirs, each with config.json)
  system      System articles repo (config.json with articles array + articles/)

${bold("OPTIONS")}
  --type      Content type (see above)
  --help, -h  Show this help message

${bold("EXAMPLES")}
  wikipefia-mdx validate . --type subject
  wikipefia-mdx validate . --type teachers
  wikipefia-mdx validate . --type system
`);
}

// ── Config validation ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateConfigFile(
  configPath: string,
  schema: { safeParse: (data: unknown) => any },
  label: string
): Promise<boolean> {
  if (!existsSync(configPath)) {
    console.log(red(`  ✗ ${label} not found at ${configPath}`));
    return false;
  }

  let raw: unknown;
  try {
    const content = await readFile(configPath, "utf-8");
    raw = JSON.parse(content);
  } catch (err) {
    console.log(red(`  ✗ ${label} is not valid JSON: ${err}`));
    return false;
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    console.log(red(`  ✗ ${label} schema validation failed:`));
    for (const issue of result.error!.issues) {
      console.log(red(`    - ${issue.path.join(".")}: ${issue.message}`));
    }
    return false;
  }

  console.log(green(`  ✓ ${label} is valid`));
  return true;
}

// ── MDX validation ───────────────────────────────────

async function validateAllMDX(
  articlesDir: string,
  prefix: string = ""
): Promise<{
  errors: number;
  warnings: number;
  total: number;
}> {
  let errors = 0;
  let warnings = 0;
  let total = 0;

  for (const locale of LOCALES) {
    const localeDir = path.join(articlesDir, locale);
    if (!existsSync(localeDir)) continue;

    const entries = await readdir(localeDir);
    const mdxFiles = entries.filter((f) => f.endsWith(".mdx"));

    for (const file of mdxFiles) {
      const filePath = path.join(localeDir, file);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) continue;

      total++;
      const source = await readFile(filePath, "utf-8");
      const relativePath = `${prefix}${locale}/${file}`;

      const result = await validateMDX(source, {
        filePath: `${locale}/${file}`,
      });

      const fileErrors = result.diagnostics.filter(
        (d) => d.severity === "error"
      );
      const fileWarnings = result.diagnostics.filter(
        (d) => d.severity === "warning"
      );

      if (fileErrors.length > 0) {
        console.log(red(`  ✗ ${relativePath}`));
        for (const d of fileErrors) {
          const loc = d.line ? ` (line ${d.line})` : "";
          console.log(red(`    ${d.category}: ${d.message}${loc}`));
        }
        errors += fileErrors.length;
      }

      if (fileWarnings.length > 0) {
        if (fileErrors.length === 0) {
          console.log(yellow(`  ⚠ ${relativePath}`));
        }
        for (const d of fileWarnings) {
          const loc = d.line ? ` (line ${d.line})` : "";
          console.log(yellow(`    ${d.category}: ${d.message}${loc}`));
        }
        warnings += fileWarnings.length;
      }

      if (fileErrors.length === 0 && fileWarnings.length === 0) {
        console.log(green(`  ✓ ${relativePath}`));
      }
    }
  }

  return { errors, warnings, total };
}

// ── Check _front.mdx presence ────────────────────────

function checkFrontMdx(articlesDir: string, prefix: string = ""): void {
  for (const locale of LOCALES) {
    const frontPath = path.join(articlesDir, locale, "_front.mdx");
    if (existsSync(frontPath)) {
      console.log(green(`  ✓ ${prefix}articles/${locale}/_front.mdx exists`));
    } else if (existsSync(path.join(articlesDir, locale))) {
      console.log(yellow(`  ⚠ ${prefix}articles/${locale}/_front.mdx is missing`));
    }
  }
}

// ── Detect teacher directories ───────────────────────

const SKIP_DIRS = new Set([
  "node_modules", "scripts", ".github", ".git", "dist", ".cursor",
]);

async function findTeacherDirs(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir);
  const dirs: string[] = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const fullPath = path.join(rootDir, entry);
    const entryStat = await stat(fullPath);
    if (!entryStat.isDirectory()) continue;
    if (existsSync(path.join(fullPath, "config.json"))) {
      dirs.push(entry);
    }
  }

  return dirs;
}

// ── Mode: subject ────────────────────────────────────

async function runSubject(rootDir: string): Promise<boolean> {
  let ok = true;

  console.log(bold("▸ Validating subject config.json..."));
  const configOk = await validateConfigFile(
    path.join(rootDir, "config.json"),
    SubjectConfig,
    "config.json"
  );
  if (!configOk) ok = false;
  console.log("");

  const articlesDir = path.join(rootDir, "articles");
  if (!existsSync(articlesDir)) {
    console.error(red(`Articles directory not found: ${articlesDir}`));
    return false;
  }

  console.log(bold("▸ Checking structure..."));
  checkFrontMdx(articlesDir);
  console.log("");

  console.log(bold("▸ Validating MDX files..."));
  const { errors, warnings, total } = await validateAllMDX(articlesDir);

  return ok && errors === 0;
}

// ── Mode: teachers (unified repo) ────────────────────

async function runTeachersUnified(rootDir: string): Promise<boolean> {
  const teacherDirs = await findTeacherDirs(rootDir);

  if (teacherDirs.length === 0) {
    console.log(red("  ✗ No teacher directories found (looking for dirs with config.json)"));
    return false;
  }

  console.log(bold(`Found ${teacherDirs.length} teacher(s): ${teacherDirs.join(", ")}`));
  console.log("");

  let allOk = true;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFiles = 0;

  for (const dirName of teacherDirs) {
    const teacherDir = path.join(rootDir, dirName);
    console.log(bold(`▸ Validating teacher: ${dirName}`));

    // Validate config
    const configOk = await validateConfigFile(
      path.join(teacherDir, "config.json"),
      TeacherConfig,
      `${dirName}/config.json`
    );
    if (!configOk) allOk = false;

    // Check articles
    const articlesDir = path.join(teacherDir, "articles");
    if (!existsSync(articlesDir)) {
      console.log(red(`  ✗ ${dirName}/articles/ not found`));
      allOk = false;
      console.log("");
      continue;
    }

    checkFrontMdx(articlesDir, `${dirName}/`);

    // Validate MDX
    const { errors, warnings, total } = await validateAllMDX(
      articlesDir,
      `${dirName}/`
    );
    totalErrors += errors;
    totalWarnings += warnings;
    totalFiles += total;
    if (errors > 0) allOk = false;

    console.log("");
  }

  // Print totals summary line for the summary section
  if (totalFiles > 0) {
    console.log(dim(`  ${teacherDirs.length} teacher(s), ${totalFiles} file(s) checked`));
  }

  return allOk && totalErrors === 0;
}

// ── Mode: system ─────────────────────────────────────

async function runSystem(rootDir: string): Promise<boolean> {
  let ok = true;

  console.log(bold("▸ Validating system config.json..."));
  const configOk = await validateConfigFile(
    path.join(rootDir, "config.json"),
    SystemConfig,
    "config.json"
  );
  if (!configOk) ok = false;
  console.log("");

  const articlesDir = path.join(rootDir, "articles");
  if (!existsSync(articlesDir)) {
    console.error(red(`Articles directory not found: ${articlesDir}`));
    return false;
  }

  console.log(bold("▸ Checking structure..."));
  // System articles don't require _front.mdx — just check locales exist
  let hasLocale = false;
  for (const locale of LOCALES) {
    const localeDir = path.join(articlesDir, locale);
    if (existsSync(localeDir)) {
      console.log(green(`  ✓ articles/${locale}/ exists`));
      hasLocale = true;
    }
  }
  if (!hasLocale) {
    console.log(red("  ✗ No locale directories found in articles/"));
    ok = false;
  }
  console.log("");

  console.log(bold("▸ Validating MDX files..."));
  const { errors, warnings, total } = await validateAllMDX(articlesDir);

  return ok && errors === 0;
}

// ── Mode: single teacher ─────────────────────────────

async function runSingleTeacher(rootDir: string): Promise<boolean> {
  let ok = true;

  console.log(bold("▸ Validating teacher config.json..."));
  const configOk = await validateConfigFile(
    path.join(rootDir, "config.json"),
    TeacherConfig,
    "config.json"
  );
  if (!configOk) ok = false;
  console.log("");

  const articlesDir = path.join(rootDir, "articles");
  if (!existsSync(articlesDir)) {
    console.error(red(`Articles directory not found: ${articlesDir}`));
    return false;
  }

  console.log(bold("▸ Checking structure..."));
  checkFrontMdx(articlesDir);
  console.log("");

  console.log(bold("▸ Validating MDX files..."));
  const { errors, warnings, total } = await validateAllMDX(articlesDir);

  return ok && errors === 0;
}

// ── Main ─────────────────────────────────────────────

async function main() {
  const parsed = parseArgs(process.argv);

  if (parsed.command === "help") {
    printHelp();
    process.exit(0);
  }

  if (parsed.command === "unknown") {
    console.error(red(`Unknown command: "${parsed.raw}". Use --help for usage.`));
    process.exit(2);
  }

  const { dir, type } = parsed;
  const rootDir = path.resolve(dir);

  console.log("");
  console.log(bold("╔══════════════════════════════════════════════╗"));
  console.log(bold("║  WIKIPEFIA MDX VALIDATOR                     ║"));
  console.log(bold("╚══════════════════════════════════════════════╝"));
  console.log("");

  let success: boolean;

  switch (type) {
    case "subject":
      success = await runSubject(rootDir);
      break;
    case "teachers":
      success = await runTeachersUnified(rootDir);
      break;
    case "teacher":
      success = await runSingleTeacher(rootDir);
      break;
    case "system":
      success = await runSystem(rootDir);
      break;
    default: {
      // No type specified — just validate MDX files
      const articlesDir = path.join(rootDir, "articles");
      if (!existsSync(articlesDir)) {
        console.error(red(`Articles directory not found: ${articlesDir}`));
        console.error(dim(`  Expected layout: ${dir}/articles/{locale}/*.mdx`));
        process.exit(1);
      }
      console.log(bold("▸ Validating MDX files..."));
      const { errors } = await validateAllMDX(articlesDir);
      success = errors === 0;
    }
  }

  // Summary
  console.log("");
  console.log("─".repeat(48));
  console.log("");

  if (!success) {
    console.log(red("✗ Validation FAILED"));
    console.log("");
    process.exit(1);
  } else {
    console.log(green("✓ Validation passed"));
    console.log("");
  }
}

main().catch((err) => {
  console.error(red(`Fatal error: ${err}`));
  process.exit(1);
});
