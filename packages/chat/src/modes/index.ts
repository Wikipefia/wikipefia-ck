/**
 * Modes registry — public entry point for the Thread Modes system.
 *
 * Adding a new mode:
 *   1. Create `<your-mode>.mode.ts` exporting a `ModeDefinition`.
 *   2. Add ONE line to `MODE_REGISTRY` below.
 *
 * Both backend (Convex Node action) and frontend (React UI) import from
 * here. Pure TypeScript — no React, no Node-only APIs.
 */

import { defaultMode } from "./default.mode";
import { tutorMode } from "./tutor.mode";
import type { ModeDefinition, ModeSetting } from "./types";

export type {
  ModeDefinition,
  ModeSetting,
  EnumSetting,
  BooleanSetting,
  StringSetting,
  ModeAllowedTools,
  Localized,
  BuildSystemPromptArgs,
} from "./types";

/**
 * Stable id of the implicit-default mode. Threads with `mode = undefined`
 * resolve to this. Don't rename.
 */
export const DEFAULT_MODE_ID = "default";

/**
 * Static registry. Static = both backend bundles and frontend bundles see
 * the same set, no runtime registration races.
 */
export const MODE_REGISTRY: Record<string, ModeDefinition> = {
  [defaultMode.id]: defaultMode,
  [tutorMode.id]: tutorMode,
};

/**
 * Resolve a mode by id, falling back to the default mode for unknown or
 * undefined ids. Unknown-id fallback protects against forward-compat: if a
 * future mode is removed, old threads still render (in default mode).
 */
export function getMode(id: string | undefined | null): ModeDefinition {
  if (!id) return MODE_REGISTRY[DEFAULT_MODE_ID];
  return MODE_REGISTRY[id] ?? MODE_REGISTRY[DEFAULT_MODE_ID];
}

/**
 * Modes shown in the picker UI (hidden ones are excluded).
 * Order: registry order (insertion order in JavaScript objects).
 */
export function listVisibleModes(): ModeDefinition[] {
  return Object.values(MODE_REGISTRY).filter((m) => !m.hidden);
}

/**
 * Apply a mode's setting defaults to a partial settings object.
 * Use to materialize the resolved snapshot we persist on `threadMeta`,
 * so later changes to default values don't retroactively alter old threads.
 */
export function applyDefaults(
  mode: ModeDefinition,
  settings: Record<string, unknown> | undefined | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of mode.settings) {
    out[s.key] = settings?.[s.key] ?? s.defaultValue;
  }
  return out;
}

/** Helper: extract a setting's prompt fragment, type-erased for callers. */
export function settingPromptFragment(
  setting: ModeSetting,
  value: unknown,
  allSettings: Record<string, unknown>,
): string | null {
  if (setting.type === "enum") {
    return setting.promptFragment?.(String(value), allSettings) ?? null;
  }
  if (setting.type === "boolean") {
    return setting.promptFragment?.(Boolean(value), allSettings) ?? null;
  }
  if (setting.type === "string") {
    return setting.promptFragment?.(String(value ?? ""), allSettings) ?? null;
  }
  return null;
}
