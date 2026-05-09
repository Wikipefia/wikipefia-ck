/**
 * Types for the Thread Modes system.
 *
 * A "mode" is a configuration package that bundles:
 *   - a system prompt (the most important part),
 *   - a set of allowed tools (which widgets / agent tools the mode exposes),
 *   - declarative settings (rendered generically by the picker UI),
 *   - prompt fragments injected based on setting values.
 *
 * Adding a new mode = creating ONE file in `modes/<name>.mode.ts` + adding
 * one entry to `MODE_REGISTRY` in `modes/index.ts`. No scattered changes.
 *
 * The same definitions are imported by:
 *   - the Convex Node action (to build the agent), and
 *   - the React UI (to render the mode picker + settings panel).
 *
 * Therefore this subpath is pure TypeScript (no React, no Node-only APIs).
 */

/**
 * A localised string. v1 supports en + ru; cs is forward-compatible.
 * The picker UI currently hard-codes `ru` while the project is Russian-leaning.
 */
export interface Localized {
  en: string;
  ru: string;
  cs?: string;
}

interface BaseSetting {
  /** Stable key used in storage and prompt-fragment lookup. NEVER rename after release. */
  key: string;
  /** Localized label shown in the picker UI. */
  label: Localized;
  /** Optional helper text under the control. */
  hint?: Localized;
}

export interface EnumSetting<TValue extends string = string>
  extends BaseSetting {
  type: "enum";
  options: Array<{ value: TValue; label: Localized }>;
  defaultValue: TValue;
  /** Returns a prompt fragment to inject when this option is selected. */
  promptFragment?: (
    value: TValue,
    allSettings: Record<string, unknown>,
  ) => string | null;
}

export interface BooleanSetting extends BaseSetting {
  type: "boolean";
  defaultValue: boolean;
  promptFragment?: (
    value: boolean,
    allSettings: Record<string, unknown>,
  ) => string | null;
}

export interface StringSetting extends BaseSetting {
  type: "string";
  defaultValue: string;
  placeholder?: Localized;
  multiline?: boolean;
  required?: boolean;
  promptFragment?: (
    value: string,
    allSettings: Record<string, unknown>,
  ) => string | null;
}

export type ModeSetting = EnumSetting | BooleanSetting | StringSetting;

/**
 * `allowedTools` lets a mode declare which agent tools are accessible.
 *   - `default` — the existing behavior (CORE_TIER widgets + lookupWidgetDocs +
 *     QuestionBox; secondary widgets unlocked via lookupWidgetDocs as before).
 *   - `include` — strict whitelist; these tools are added on top of the
 *     baseline (`lookupWidgetDocs`, `QuestionBox`) and made always-active in
 *     `prepareStep`.
 *   - `exclude` — start from baseline + unlocked widgets, then remove.
 */
export type ModeAllowedTools =
  | { kind: "default" }
  | { kind: "include"; tools: string[] }
  | { kind: "exclude"; tools: string[] };

export interface BuildSystemPromptArgs {
  /** Resolved (defaults-applied) settings for the thread. */
  settings: Record<string, unknown>;
  /**
   * Catalog of widget names + descriptions. Passed in so `buildSystemPrompt`
   * stays pure; the helper that produces it lives in the tools subpath.
   */
  widgetCatalog: string;
}

/**
 * A complete mode package. Adding a new mode = creating one of these and
 * registering it in `MODE_REGISTRY`.
 */
export interface ModeDefinition {
  /** Stable id stored in `threadMeta.mode`. NEVER change after release. */
  id: string;
  /**
   * Bumped when the prompt or settings shape changes meaningfully.
   * Recorded per-thread on creation as `modePromptVersion`.
   */
  promptVersion: string;
  /** UI label and description (en + ru). */
  label: Localized;
  description: Localized;
  /** Single-character icon shown in the picker / badge. */
  icon: string;
  /** When true, hidden from the picker. The default mode is hidden. */
  hidden?: boolean;
  /** Declarative settings; rendered generically by the picker. */
  settings: ModeSetting[];
  /** Whitelist / exclude / default for the agent's tool set. */
  allowedTools: ModeAllowedTools;

  /**
   * Build the full system prompt for this mode given the chosen settings.
   * Pure function — both backend and frontend can call.
   */
  buildSystemPrompt(args: BuildSystemPromptArgs): string;
}
