"use client";

import {
  useState,
  type ReactNode,
  Children,
  createContext,
  useContext,
} from "react";
import { useTranslations } from "next-intl";
import { C } from "@/lib/theme";

/* ── Types ────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

/* ── Option ──────────────────────────────────────────── */

interface OptionProps {
  value: string;
  correct?: boolean;
  children: ReactNode;
}

export function Option({ children }: OptionProps) {
  return <>{children}</>;
}

/* ── Question ────────────────────────────────────────── */

interface QuestionContextValue {
  submitted: boolean;
  selected: string | null;
  onSelect: (value: string) => void;
}

const QuestionContext = createContext<QuestionContextValue>({
  submitted: false,
  selected: null,
  onSelect: () => {},
});

interface QuestionProps {
  text: string;
  children: ReactNode;
}

function QuestionInner({
  text,
  children,
  index,
  submitted,
  selected,
  onSelect,
}: QuestionProps & {
  index: number;
  submitted: boolean;
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  // Extract options
  const options: { value: string; correct: boolean; label: ReactNode }[] = [];
  Children.forEach(children, (child) => {
    if (child && typeof child === "object" && "props" in child) {
      const props = (child as AnyElement).props as OptionProps;
      if (props.value !== undefined) {
        options.push({
          value: props.value,
          correct: props.correct === true || (props.correct as unknown) === "",
          label: props.children,
        });
      }
    }
  });

  const correctValue = options.find((o) => o.correct)?.value;

  return (
    <div className="mb-5 last:mb-0">
      {/* Question text */}
      <p
        className="text-[13px] font-bold mb-3 flex gap-2"
        style={{ fontFamily: "var(--font-mono)", color: C.text }}
      >
        <span style={{ color: C.textMuted }} className="shrink-0">Q{index + 1}.</span>
        <span>{text}</span>
      </p>

      {/* Options */}
      <div className="space-y-1.5 ml-6">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          const isCorrect = opt.correct;

          let borderColor: string = C.borderLight;
          let bg: string = "transparent";
          let textColor: string = C.text;

          if (submitted) {
            if (isCorrect) {
              borderColor = "#22863a";
              bg = "rgba(34, 134, 58, 0.06)";
              textColor = "#22863a";
            } else if (isSelected && !isCorrect) {
              borderColor = "#cc0000";
              bg = "rgba(204, 0, 0, 0.04)";
              textColor = "#cc0000";
            }
          } else if (isSelected) {
            borderColor = C.border;
            bg = C.bg;
          }

          return (
            <button
              key={opt.value}
              onClick={() => !submitted && onSelect(opt.value)}
              disabled={submitted}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[13px] transition-all cursor-pointer disabled:cursor-default border-2"
              style={{
                fontFamily: "var(--font-serif)",
                borderColor,
                backgroundColor: bg,
                color: textColor,
              }}
            >
              {/* Radio indicator */}
              <span
                className="w-3.5 h-3.5 shrink-0 border-2 flex items-center justify-center"
                style={{
                  borderColor: submitted
                    ? isCorrect
                      ? "#22863a"
                      : isSelected
                        ? "#cc0000"
                        : C.borderLight
                    : isSelected
                      ? C.border
                      : C.borderLight,
                }}
              >
                {submitted && isCorrect && (
                  <span
                    className="block w-1.5 h-1.5"
                    style={{ backgroundColor: "#22863a" }}
                  />
                )}
                {submitted && isSelected && !isCorrect && (
                  <span
                    className="text-[8px] font-bold"
                    style={{ color: "#cc0000" }}
                  >
                    ✕
                  </span>
                )}
                {!submitted && isSelected && (
                  <span
                    className="block w-1.5 h-1.5"
                    style={{ backgroundColor: C.border }}
                  />
                )}
              </span>

              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Question(props: QuestionProps) {
  const ctx = useContext(QuestionContext);
  // When rendered standalone (outside Quiz), provide a minimal context
  return (
    <QuestionContext.Provider value={ctx}>
      {/* Rendered by Quiz parent */}
      <>{props.children}</>
    </QuestionContext.Provider>
  );
}

/* ── Quiz ────────────────────────────────────────────── */

interface QuizProps {
  children: ReactNode;
}

export function Quiz({ children }: QuizProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations("common");

  // Extract Question children
  const questions: { text: string; content: ReactNode }[] = [];
  Children.forEach(children, (child) => {
    if (
      child &&
      typeof child === "object" &&
      "props" in child &&
      (child as AnyElement).props?.text
    ) {
      questions.push({
        text: (child as AnyElement).props.text,
        content: (child as AnyElement).props.children,
      });
    }
  });

  // Count correct answers
  const getCorrectCount = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      const options: { value: string; correct: boolean }[] = [];
      Children.forEach(q.content, (child) => {
        if (child && typeof child === "object" && "props" in child) {
          const p = (child as AnyElement).props as OptionProps;
          if (p.value !== undefined) {
            options.push({
              value: p.value,
              correct: p.correct === true || (p.correct as unknown) === "",
            });
          }
        }
      });
      const correctOpt = options.find((o) => o.correct);
      if (correctOpt && answers[i] === correctOpt.value) {
        correct++;
      }
    });
    return correct;
  };

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b-2"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          {t("quiz")} — {questions.length} {questions.length !== 1 ? t("questions") : t("question")}
        </span>
        {submitted && (
          <span
            className="text-[10px] font-bold tracking-[0.1em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            {getCorrectCount()}/{questions.length} {t("correct")}
          </span>
        )}
      </div>

      {/* Questions */}
      <div className="p-4">
        {questions.map((q, i) => (
          <QuestionInner
            key={i}
            text={q.text}
            index={i}
            submitted={submitted}
            selected={answers[i] ?? null}
            onSelect={(v) =>
              setAnswers((prev) => ({ ...prev, [i]: v }))
            }
          >
            {q.content}
          </QuestionInner>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t-2"
        style={{ borderColor: C.borderLight }}
      >
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!allAnswered}
            className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              fontFamily: "var(--font-mono)",
              borderColor: C.border,
              backgroundColor: allAnswered ? C.headerBg : "transparent",
              color: allAnswered ? C.headerText : C.text,
            }}
          >
            {t("checkAnswers")}
          </button>
        ) : (
          <button
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
            }}
            className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] border-2 cursor-pointer transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              borderColor: C.border,
              color: C.text,
            }}
          >
            {t("tryAgain")}
          </button>
        )}

        {!submitted && (
          <span
            className="text-[10px] tracking-wider uppercase"
            style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
          >
            {Object.keys(answers).length}/{questions.length} {t("answered")}
          </span>
        )}
      </div>
    </div>
  );
}
