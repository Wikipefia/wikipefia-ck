/**
 * Design tokens (CSS-variable backed) — mirrors the palette used across the
 * Wikipefia apps (studio/portal). Components style with these via inline
 * `style={{ ... }}` + Tailwind utilities for layout, matching the house idiom.
 */
export const C = {
  bg: "var(--c-bg)",
  bgWhite: "var(--c-bg-white)",
  text: "var(--c-text)",
  textMuted: "var(--c-text-muted)",
  accent: "var(--c-accent)",
  border: "var(--c-border)",
  borderLight: "var(--c-border-light)",

  /** Inverted surface — always dark bg + light text in both modes. */
  headerBg: "var(--c-header-bg)",
  headerText: "var(--c-header-text)",
} as const;

export const FONT = {
  mono: "var(--font-mono)",
  serif: "var(--font-serif)",
  editor: "var(--font-editor)",
} as const;
