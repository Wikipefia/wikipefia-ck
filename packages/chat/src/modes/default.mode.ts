/**
 * Default mode — a thin wrapper around the existing SYSTEM_PROMPT_V1
 * behavior. This is the baseline: no settings, default tool tier (lookup
 * + core tier + unlock-via-docs), free-form Q&A.
 *
 * Hidden from the picker — selected implicitly when the user starts a new
 * thread without choosing a mode.
 *
 * Existing threads (created before the modes feature) read `mode = undefined`
 * and resolve to this mode → identical behavior, zero regression.
 */

import { SYSTEM_PROMPT_V1, SYSTEM_PROMPT_VERSION } from "../tools/system-prompt";
import type { ModeDefinition } from "./types";

export const defaultMode: ModeDefinition = {
  id: "default",
  promptVersion: SYSTEM_PROMPT_VERSION,
  label: { en: "Default", ru: "Обычный" },
  description: {
    en: "Free-form Q&A with rich interactive widgets.",
    ru: "Свободный диалог с интерактивными виджетами.",
  },
  icon: "◇",
  hidden: true,
  settings: [],
  allowedTools: { kind: "default" },
  buildSystemPrompt: () => SYSTEM_PROMPT_V1,
};
