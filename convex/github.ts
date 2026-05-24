"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createSign } from "node:crypto";

// ── GitHub App JWT ──

function createAppJWT(appId: string, privateKey: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId }),
  ).toString("base64url");

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey, "base64url");

  return `${header}.${payload}.${signature}`;
}

async function getInstallationToken(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !installationId || !rawKey) {
    throw new Error(
      "Missing GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, or GITHUB_APP_PRIVATE_KEY",
    );
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");
  const jwt = createAppJWT(appId, privateKey);

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.token;
}

// ── GitHub API helpers ──

async function githubGet(
  token: string,
  url: string,
): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res;
}

interface TreeEntry {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

async function fetchRepoTree(
  token: string,
  repo: string,
  branch: string,
): Promise<TreeEntry[]> {
  const res = await githubGet(
    token,
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
  );
  const data = await res.json();
  return (data.tree as TreeEntry[]).map((e) => ({
    path: e.path,
    type: e.type,
    sha: e.sha,
    size: e.size,
  }));
}

async function fetchFileRaw(
  token: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch ${path} (${res.status}): ${body}`);
  }
  return await res.text();
}

// ── Exported actions ──

/**
 * Discover all content repos from the GitHub App installation.
 * Matches: subject-*, teachers, system-articles.
 * For each new repo, fetches config.json to populate name/metadata.
 */
export const discoverRepos = action({
  args: {},
  handler: async (ctx): Promise<number> => {
    const token = await getInstallationToken();

    // List all repos accessible by the GitHub App installation
    const res = await githubGet(
      token,
      "https://api.github.com/installation/repositories?per_page=100",
    );
    const data = await res.json();
    const repos = data.repositories as Array<{
      name: string;
      full_name: string;
      default_branch: string;
      description: string | null;
    }>;

    let added = 0;

    for (const repo of repos) {
      // Determine type from naming convention
      let type: "subject" | "teacher" | "system" | null = null;
      if (repo.name.startsWith("subject-")) type = "subject";
      else if (repo.name === "teachers") type = "teacher";
      else if (repo.name === "system-articles") type = "system";
      if (!type) continue;

      // Check if already tracked
      const existing = await ctx.runQuery(
        internal.projects.getByGithubRepo,
        { githubRepo: repo.full_name },
      );

      // Try to fetch config.json for proper name/slug
      let configJson = null;
      try {
        const raw = await fetchFileRaw(
          token,
          repo.full_name,
          repo.default_branch,
          "config.json",
        );
        configJson = JSON.parse(raw);
      } catch {
        // No config.json yet — that's OK
      }

      // Derive slug and name from config or repo name
      const slug =
        configJson?.slug ??
        repo.name.replace(/^subject-/, "");
      const name =
        (configJson?.name?.en as string | undefined) ??
        repo.name
          .replace(/^subject-/, "")
          .split("-")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      const description =
        (configJson?.description?.en as string | undefined) ??
        repo.description ??
        "";

      if (existing) {
        // Re-discover: update config if changed
        if (configJson) {
          await ctx.runMutation(internal.projects.upsertFromGithub, {
            slug,
            name,
            description,
            githubRepo: repo.full_name,
            branch: repo.default_branch,
            type,
            configJson,
          });
        }
        continue;
      }

      await ctx.runMutation(internal.projects.upsertFromGithub, {
        slug,
        name,
        description,
        githubRepo: repo.full_name,
        branch: repo.default_branch,
        type,
        configJson: configJson ?? undefined,
      });
      added++;
    }

    return added;
  },
});

export const syncProject = action({
  args: { slug: v.string() },
  handler: async (ctx, { slug }): Promise<void> => {
    const project = await ctx.runQuery(
      internal.projects.getBySlugInternal,
      { slug },
    );
    if (!project) throw new Error(`Project "${slug}" not found`);

    const token = await getInstallationToken();
    const tree = await fetchRepoTree(token, project.githubRepo, project.branch);

    // Fetch config.json if it exists in the tree
    let configJson = null;
    const hasConfig = tree.some(
      (e) => e.path === "config.json" && e.type === "blob",
    );
    if (hasConfig) {
      const raw = await fetchFileRaw(
        token,
        project.githubRepo,
        project.branch,
        "config.json",
      );
      configJson = JSON.parse(raw);
    }

    await ctx.runMutation(internal.projects.updateProjectCache, {
      id: project._id,
      configJson,
      cachedTree: tree,
      lastSynced: Date.now(),
    });
  },
});

export const fetchFile = action({
  args: {
    slug: v.string(),
    path: v.string(),
  },
  handler: async (ctx, { slug, path }): Promise<string> => {
    const project = await ctx.runQuery(
      internal.projects.getBySlugInternal,
      { slug },
    );
    if (!project) throw new Error(`Project "${slug}" not found`);

    const token = await getInstallationToken();
    return await fetchFileRaw(
      token,
      project.githubRepo,
      project.branch,
      path,
    );
  },
});
