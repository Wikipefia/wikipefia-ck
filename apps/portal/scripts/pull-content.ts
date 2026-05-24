#!/usr/bin/env tsx
/**
 * pull-content.ts — Fetches content from GitHub repositories.
 *
 * Reads content-sources.json and clones/downloads content repos
 * into the content/ directory.
 *
 * Content source types:
 *   - subjects: Array of individual repos, one per subject
 *   - teachers: Single unified repo containing all teacher directories
 *   - system:   Single repo containing system articles
 *
 * In CI (GITHUB_ACTIONS=true): uses GitHub API tarball download.
 * Locally: uses git clone --depth 1.
 */

import { readFile, mkdir, rm, cp } from "fs/promises";
import { existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import os from "os";

const ROOT = process.cwd();

interface ContentSource {
  repo: string;
  branch: string;
  path: string;
  targetDir: string;
}

interface ContentSources {
  subjects: ContentSource[];
  teachers: ContentSource;  // Single unified repo
  system: ContentSource;
}

async function pullSource(
  source: ContentSource,
  isCI: boolean,
  githubToken: string | undefined
): Promise<boolean> {
  const targetPath = path.join(ROOT, source.targetDir);
  console.log(`▸ ${source.repo} → ${source.targetDir}`);

  // Clean target directory before pulling fresh content
  if (existsSync(targetPath)) {
    await rm(targetPath, { recursive: true, force: true });
    console.log("  Cleaned existing directory.");
  }

  if (isCI && githubToken) {
    // Download tarball using GitHub API
    try {
      const tmpDir = path.join(
        os.tmpdir(),
        `wikipefia-pull-${Date.now()}`
      );
      await mkdir(tmpDir, { recursive: true });

      const tarballUrl = `https://api.github.com/repos/${source.repo}/tarball/${source.branch}`;
      execSync(
        `curl -sL -H "Authorization: token ${githubToken}" "${tarballUrl}" | tar xz -C "${tmpDir}" --strip-components=1`,
        { stdio: "pipe" }
      );

      // Ensure target dir exists and copy
      await mkdir(targetPath, { recursive: true });
      const sourcePath =
        source.path === "." ? tmpDir : path.join(tmpDir, source.path);
      await cp(sourcePath, targetPath, { recursive: true });

      // Cleanup
      await rm(tmpDir, { recursive: true, force: true });
      console.log("  ✓ Downloaded and extracted.");
      return true;
    } catch (err: any) {
      console.error(`  ✗ Failed to download: ${err.message}`);
      return false;
    }
  } else {
    // Local: git clone
    try {
      const tmpDir = path.join(
        os.tmpdir(),
        `wikipefia-clone-${Date.now()}`
      );
      execSync(
        `git clone --depth 1 --branch ${source.branch} https://github.com/${source.repo}.git "${tmpDir}"`,
        { stdio: "pipe" }
      );

      await mkdir(targetPath, { recursive: true });
      const sourcePath =
        source.path === "." ? tmpDir : path.join(tmpDir, source.path);
      await cp(sourcePath, targetPath, { recursive: true });

      await rm(tmpDir, { recursive: true, force: true });
      console.log("  ✓ Cloned and copied.");
      return true;
    } catch (err: any) {
      console.error(`  ✗ Clone failed: ${err.message || err}`);
      return false;
    }
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   WIKIPEFIA CONTENT PULL             ║");
  console.log("╚══════════════════════════════════════╝\n");

  const sourcesPath = path.join(ROOT, "content-sources.json");
  if (!existsSync(sourcesPath)) {
    console.log("No content-sources.json found — skipping pull.");
    console.log("Using local content/ directory as-is.\n");
    return;
  }

  const raw = await readFile(sourcesPath, "utf-8");
  const sources: ContentSources = JSON.parse(raw);

  const isCI = process.env.GITHUB_ACTIONS === "true";
  const githubToken = process.env.GITHUB_TOKEN;

  // Count total sources
  const subjectCount = sources.subjects?.length || 0;
  const hasTeachers = !!sources.teachers;
  const hasSystem = !!sources.system;
  const totalSources = subjectCount + (hasTeachers ? 1 : 0) + (hasSystem ? 1 : 0);

  console.log(`Found ${totalSources} content source(s):`);
  console.log(`  ${subjectCount} subject repo(s)`);
  console.log(`  ${hasTeachers ? "1 unified teachers repo" : "no teachers repo"}`);
  console.log(`  ${hasSystem ? "1 system articles repo" : "no system articles repo"}`);
  console.log(`Mode: ${isCI ? "CI (GitHub Actions)" : "Local"}\n`);

  let allOk = true;

  // Pull subjects (individual repos)
  if (sources.subjects) {
    console.log("── Subject Repos ──────────────────────\n");
    for (const source of sources.subjects) {
      const ok = await pullSource(source, isCI, githubToken);
      if (!ok) allOk = false;
    }
  }

  // Pull teachers (single unified repo → content/teachers/)
  if (sources.teachers) {
    console.log("\n── Teachers Repo (unified) ────────────\n");
    const ok = await pullSource(sources.teachers, isCI, githubToken);
    if (!ok) allOk = false;
  }

  // Pull system articles
  if (sources.system) {
    console.log("\n── System Articles Repo ───────────────\n");
    const ok = await pullSource(sources.system, isCI, githubToken);
    if (!ok) allOk = false;
  }

  // Verify structure
  console.log("\n▸ Verifying content structure...");

  // Verify subjects
  for (const source of sources.subjects || []) {
    const dir = path.join(ROOT, source.targetDir);
    if (!existsSync(path.join(dir, "config.json"))) {
      console.error(`  ✗ Missing config.json in ${source.targetDir}`);
      allOk = false;
    }
    if (!existsSync(path.join(dir, "articles"))) {
      console.error(`  ✗ Missing articles/ in ${source.targetDir}`);
      allOk = false;
    }
  }

  // Verify teachers (unified: each subdirectory should have config.json)
  if (sources.teachers) {
    const teachersDir = path.join(ROOT, sources.teachers.targetDir);
    if (existsSync(teachersDir)) {
      const { readdirSync, statSync } = await import("fs");
      const entries = readdirSync(teachersDir, { withFileTypes: true });
      const teacherDirs = entries.filter((e) => {
        if (!e.isDirectory()) return false;
        // Skip common non-teacher dirs that may come from the repo
        if (["node_modules", "scripts", ".github", ".git", "dist"].includes(e.name)) return false;
        if (e.name.startsWith(".")) return false;
        return true;
      });

      let teacherCount = 0;
      for (const d of teacherDirs) {
        const configPath = path.join(teachersDir, d.name, "config.json");
        if (existsSync(configPath)) {
          teacherCount++;
        } else if (existsSync(path.join(teachersDir, d.name, "articles"))) {
          // Has articles/ but no config.json — likely a teacher dir with missing config
          console.error(`  ✗ Teacher dir ${d.name}/ has articles/ but missing config.json`);
          allOk = false;
        }
      }
      console.log(`  ✓ Found ${teacherCount} teacher(s) in unified teachers repo`);
    }
  }

  // Verify system
  if (sources.system) {
    const sysDir = path.join(ROOT, sources.system.targetDir);
    if (!existsSync(path.join(sysDir, "config.json"))) {
      console.error(`  ✗ Missing config.json in ${sources.system.targetDir}`);
      allOk = false;
    }
    if (!existsSync(path.join(sysDir, "articles"))) {
      console.error(`  ✗ Missing articles/ in ${sources.system.targetDir}`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log("  ✓ All content directories verified.\n");
  } else {
    console.error(
      "\n✗ Content structure verification failed. Check the errors above.\n"
    );
    if (isCI) process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n✗ Pull failed:", err);
  process.exit(1);
});
