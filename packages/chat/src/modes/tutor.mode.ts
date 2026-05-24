/**
 * Tutor mode (Режим репетитора).
 *
 * Three macro-phases:
 *   1. Phase 0 (input → review): the model breaks user's input into a
 *      list of small sub-topics via the `PlanTopics` tool. The user
 *      reviews/edits the plan in a side panel and approves.
 *   2. Phase 1 (teaching): the model teaches topic-by-topic using the
 *      A→B→C protocol, scoped to ONE topic per cycle, advancing through
 *      the plan via `NextTopicButton`.
 *   3. Completed: all topics covered.
 *
 * Architecture: all long-form prose lives in `prompt-fragments/*.ts`.
 * This file is the registration point: settings declared declaratively,
 * `buildSystemPrompt` composes fragments + injects per-thread runtime
 * state (current phase, active topic from the plan).
 */

import type { ModeDefinition, ModeSetting, TutorTopic } from "./types";
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

/**
 * Build the dynamic threadState block that's prepended to the system
 * prompt. Encodes the current `tutorPhase` + (in teaching) the active
 * topic and the surrounding plan context so the model knows what to do
 * RIGHT NOW.
 */
function buildThreadStateBlock(
  topicPlan: TutorTopic[] | undefined,
  tutorPhase: string | undefined,
): string {
  const phase = tutorPhase ?? "input";
  const lines: string[] = [];
  lines.push("## CURRENT TUTOR STATE");
  lines.push("");
  lines.push(`TUTOR PHASE: ${phase}`);
  lines.push("");

  if (phase === "input") {
    lines.push(
      "ДЕЙСТВИЕ: тебе нужно эмить tool `PlanTopics` с разбиением материала на темы. Никакой прозы. См. секцию 'Phase 0' в основном промте.",
    );
    return lines.join("\n");
  }

  if (phase === "review") {
    lines.push(
      "ДЕЙСТВИЕ: план уже эмитнут и пользователь его сейчас просматривает в side panel. Ты находишься в paused-состоянии (approval pending). На следующем шаге ты получишь tool-result от `PlanTopics` — это будет либо `{ \"action\": \"start\" }` (начинай teaching с первой темы), либо `{ \"action\": \"replan\", ... }` (выдай новый PlanTopics).",
    );
    return lines.join("\n");
  }

  // Teaching or completed: include the plan + active topic info.
  if (!topicPlan || topicPlan.length === 0) {
    lines.push(
      "ВНИМАНИЕ: план пуст или не загружен. Эмить `PlanTopics` заново.",
    );
    return lines.join("\n");
  }

  const active = topicPlan.find((t) => t.status === "active");
  const completedCount = topicPlan.filter((t) => t.status === "completed").length;
  const remainingCount = topicPlan.filter(
    (t) => t.status === "pending" || t.status === "active",
  ).length;

  lines.push("PLAN:");
  for (const t of topicPlan) {
    const marker =
      t.status === "completed"
        ? "✓"
        : t.status === "active"
          ? "▶"
          : t.status === "skipped"
            ? "✗"
            : "•";
    lines.push(`  ${marker} [${t.order + 1}] ${t.title}`);
  }
  lines.push("");
  lines.push(
    `Прогресс: ${completedCount} тем из ${topicPlan.length} пройдено, ${remainingCount} осталось.`,
  );
  lines.push("");

  if (phase === "completed" || !active) {
    lines.push(
      "ДЕЙСТВИЕ: все темы пройдены. Эмить итоговое summary 3-5 буллетами по тому, что разобрали. Никаких tool-call'ов — это финальное сообщение.",
    );
    return lines.join("\n");
  }

  // Active topic — full details.
  lines.push(`АКТИВНАЯ ТЕМА (она же — ТЕКУЩАЯ для tutor-цикла A→B→C):`);
  lines.push("");
  lines.push(`  Title: ${active.title}`);
  lines.push(`  Description: ${active.description}`);
  lines.push("");
  lines.push("  Prompt (твоё задание для этой темы):");
  for (const line of active.prompt.split("\n")) {
    lines.push(`    ${line}`);
  }
  lines.push("");

  // Hint for the next topic so NextTopicButton's nextTopicHint is easy.
  const activeIdx = topicPlan.findIndex((t) => t.id === active.id);
  const next = activeIdx >= 0 ? topicPlan[activeIdx + 1] : undefined;
  if (next) {
    lines.push(
      `СЛЕДУЮЩАЯ ТЕМА (для NextTopicButton.nextTopicHint после завершения текущей):`,
    );
    lines.push(`  ${next.title}`);
  } else {
    lines.push(
      `Это ПОСЛЕДНЯЯ тема плана. После её прохождения НЕ эмить NextTopicButton — вместо этого эмить итоговое summary 3-5 буллетами.`,
    );
  }

  return lines.join("\n");
}

export const tutorMode: ModeDefinition = {
  id: "tutor",
  // Bumped to v2 because the protocol changed (Phase 0 + topic plan).
  promptVersion: "v2",
  label: { en: "Tutor", ru: "Режим репетитора" },
  description: {
    en: "Structured chunked learning with comprehension checks and adjustable depth.",
    ru: "Пошаговое обучение по материалу: маленькие чанки, проверка понимания, регулируемая глубина.",
  },
  icon: "▤",
  settings,
  // Tutor-mode tool whitelist.
  // - PlanTopics      — Phase 0 planning
  // - AskUserQuestion — Phase C verification
  // - NextTopicButton — transition between topics
  // - Quiz is intentionally excluded.
  // Core didactic widgets are always-active so the model doesn't burn
  // steps on lookup.
  allowedTools: {
    kind: "include",
    tools: [
      "PlanTopics",
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
  buildSystemPrompt: ({ settings: values, widgetCatalog, threadState }) => {
    const out: string[] = [
      // Dynamic state goes FIRST so the model sees the most-current
      // phase/active-topic info at the top of the prompt — easiest to
      // reference. Static rules follow.
      buildThreadStateBlock(threadState?.topicPlan, threadState?.tutorPhase),
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
