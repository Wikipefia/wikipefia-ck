/**
 * Tutor mode (Режим репетитора).
 *
 * Behavior:
 *   1. The user uploads study material (PDF / lecture notes / text) and/or
 *      states a learning goal.
 *   2. The model picks the smallest self-contained chunk and explains it
 *      according to the chosen "explanation level" (beginner / standard /
 *      advanced).
 *   3. After the explanation, the model asks 1–3 comprehension questions
 *      via the `AskUserQuestion` tool (multiple_choice / numeric / free_text).
 *   4. On wrong answers, the model re-explains the chunk differently and
 *      asks a new question.
 *   5. On all correct: behavior depends on the `autoAdvance` setting:
 *      - ON  → immediately proceed to the next chunk in the same response.
 *      - OFF → emit `NextTopicButton`, which lets the user click "continue"
 *              or ask a clarifying question. The model has prompt-level
 *              autonomy to skip the button after 3+ confident chunks.
 *
 * Architecture:
 *   - All long-form prose lives in `prompt-fragments/*.ts` files. Easy to
 *     review and iterate on individually.
 *   - This file is the registration point: settings declared declaratively,
 *     `buildSystemPrompt` composes fragments by setting values.
 *
 * Adding new tutor settings = add to the `settings` array; the picker UI
 * renders the control automatically, and the prompt assembly picks up the
 * new fragment.
 */

import type { ModeDefinition, ModeSetting } from "./types";
import baseTutor from "./prompt-fragments/tutor.base";
import askDoc from "./prompt-fragments/tutor.ask-user-question";
import lvlBeginner from "./prompt-fragments/tutor.level-beginner";
import lvlStandard from "./prompt-fragments/tutor.level-standard";
import lvlAdvanced from "./prompt-fragments/tutor.level-advanced";
import autoOn from "./prompt-fragments/tutor.auto-advance-on";
import autoOff from "./prompt-fragments/tutor.auto-advance-off";

const settings: ModeSetting[] = [
  {
    key: "level",
    type: "enum",
    label: { en: "Explanation level", ru: "Глубина объяснений" },
    hint: {
      en: "How much hand-holding the tutor provides.",
      ru: "Насколько подробно репетитор разжёвывает материал.",
    },
    options: [
      {
        value: "beginner",
        label: { en: "Beginner", ru: "На пальцах" },
      },
      {
        value: "standard",
        label: { en: "Standard", ru: "Стандарт" },
      },
      {
        value: "advanced",
        label: { en: "Refresh", ru: "Освежить память" },
      },
    ],
    defaultValue: "standard",
    promptFragment: (value) => {
      if (value === "beginner") return lvlBeginner;
      if (value === "advanced") return lvlAdvanced;
      return lvlStandard;
    },
  },
  {
    key: "autoAdvance",
    type: "boolean",
    label: {
      en: "Auto-advance to next topic",
      ru: "Автопереход к следующей теме",
    },
    hint: {
      en: "When off, the tutor pauses and shows a 'Next topic' button before each new chunk.",
      ru: "Если выключено — репетитор делает паузу и показывает кнопку перед каждой новой темой.",
    },
    defaultValue: false,
    promptFragment: (value) => (value ? autoOn : autoOff),
  },
];

export const tutorMode: ModeDefinition = {
  id: "tutor",
  promptVersion: "v1",
  label: { en: "Tutor", ru: "Режим репетитора" },
  description: {
    en: "Structured chunked learning with comprehension checks and adjustable depth.",
    ru: "Пошаговое обучение по материалу: маленькие чанки, проверка понимания, регулируемая глубина.",
  },
  icon: "▤",
  settings,
  // Tutor-mode tool whitelist. AskUserQuestion + NextTopicButton are the
  // tutor-mode-only interactive tools. Quiz is intentionally excluded —
  // tutor mode uses AskUserQuestion (single-question) instead, so the
  // model has exactly one tool to reach for when checking comprehension.
  // Core didactic widgets are always-active so the model doesn't burn
  // steps on lookup.
  allowedTools: {
    kind: "include",
    tools: [
      "AskUserQuestion",
      "NextTopicButton",
      "Definition",
      "MathBlock",
      "Figure",
      "BarChart",
      "Timeline",
      "StepByStep",
      "Callout",
      "DataTable",
      "Collapse",
    ],
  },
  buildSystemPrompt: ({ settings: values, widgetCatalog }) => {
    // Compose the prompt: base → ask-tool docs → setting fragments.
    // Settings whose `promptFragment` returns null (e.g. empty studyTarget)
    // are silently skipped.
    const out: string[] = [
      baseTutor.replace("{{WIDGET_CATALOG}}", widgetCatalog),
      askDoc,
    ];
    for (const s of settings) {
      let fragment: string | null = null;
      if (s.type === "enum") {
        fragment = s.promptFragment?.(String(values[s.key] ?? s.defaultValue), values) ?? null;
      } else if (s.type === "boolean") {
        const v = values[s.key];
        const bv = typeof v === "boolean" ? v : s.defaultValue;
        fragment = s.promptFragment?.(bv, values) ?? null;
      } else if (s.type === "string") {
        const v = values[s.key];
        const sv = typeof v === "string" ? v : s.defaultValue;
        fragment = s.promptFragment?.(sv, values) ?? null;
      }
      if (fragment) out.push(fragment);
    }
    return out.join("\n\n");
  },
};
