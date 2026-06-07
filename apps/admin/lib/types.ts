/**
 * Project types for the admin UI.
 *
 * `ProjectDoc` is the exact, branded document type inferred from the Convex
 * query — use it for live data so document ids stay assignable to the
 * `update`/`remove` mutations. `ProjectRecord` is a hand-written structural
 * mirror used by pure helpers (e.g. config integrity) so they don't depend on
 * generated types; a `ProjectDoc` is structurally assignable to it.
 */

import type { api } from "@wikipefia/convex/api";
import type { FunctionReturnType } from "convex/server";

export type ProjectDoc = FunctionReturnType<typeof api.projects.list>[number];

export type ProjectType = "subject" | "teacher" | "system";

export interface TreeEntry {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

export interface ProjectRecord {
  _id: string;
  _creationTime: number;
  slug: string;
  name: string;
  description: string;
  githubRepo: string;
  branch: string;
  type: ProjectType;
  configJson?: unknown;
  cachedTree?: TreeEntry[];
  lastSynced?: number;
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  subject: "Subject",
  teacher: "Teacher",
  system: "System",
};
