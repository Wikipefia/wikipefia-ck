import type { ModelDef } from "@wikipefia/chat/types";

/**
 * OpenRouter model catalog for Wikipefia Chat. Each model declares its
 * capabilities so the UI can disable incompatible models when files of
 * specific MIME types are attached.
 *
 * Add new models here — the agent uses these IDs verbatim against OpenRouter.
 */
export const MODELS: ModelDef[] = [
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    provider: "Anthropic",
    supportsImages: true,
    supportsPDF: true,
    contextWindow: 200_000,
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    provider: "OpenAI",
    supportsImages: true,
    supportsPDF: true,
    contextWindow: 200_000,
    defaultForNewThreads: true,
  },
  {
    id: "anthropic/claude-opus-4.5",
    label: "Claude Opus 4.5",
    provider: "Anthropic",
    supportsImages: true,
    supportsPDF: true,
    contextWindow: 200_000,
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    supportsImages: true,
    supportsPDF: false,
    contextWindow: 128_000,
  },
  {
    id: "~google/gemini-flash-latest",
    label: "Google Gemini Flash",
    provider: "Google",
    supportsImages: true,
    supportsPDF: true,
    contextWindow: 1_048_576,
  },
];

export const DEFAULT_MODEL_ID =
  MODELS.find((m) => m.defaultForNewThreads)?.id ?? MODELS[0].id;
