"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface Labels {
  note: string;
  warning: string;
  danger: string;
  quiz: string;
  question: string;
  questions: string;
  correct: string;
  checkAnswers: string;
  tryAgain: string;
  answered: string;
  playground: string;
  copy: string;
  copied: string;
  reset: string;
  editableHint: string;
  interactive: string;
  control: string;
  controls: string;
  on: string;
  off: string;
  stepByStep: string;
  current: string;
  back: string;
  nextStep: string;
  resetStep: string;
}

export const DEFAULT_LABELS: Labels = {
  note: "NOTE",
  warning: "WARNING",
  danger: "DANGER",
  quiz: "QUIZ",
  question: "question",
  questions: "questions",
  correct: "correct",
  checkAnswers: "Check answers",
  tryAgain: "Try again",
  answered: "answered",
  playground: "Playground",
  copy: "Copy",
  copied: "Copied",
  reset: "Reset",
  editableHint: "Editable — try changing the code",
  interactive: "Interactive",
  control: "control",
  controls: "controls",
  on: "ON",
  off: "OFF",
  stepByStep: "Step by step",
  current: "CURRENT",
  back: "Back",
  nextStep: "Next",
  resetStep: "Restart",
};

const LabelsContext = createContext<Labels>(DEFAULT_LABELS);

export function LabelsProvider({ labels, children }: { labels: Labels; children: ReactNode }) {
  return <LabelsContext.Provider value={labels}>{children}</LabelsContext.Provider>;
}

export function useLabels(): Labels {
  return useContext(LabelsContext);
}
