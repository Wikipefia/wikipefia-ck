/** Design Tokens (CSS Variable-backed) */
export const C = {
  bg: "var(--c-bg)",
  bgWhite: "var(--c-bg-white)",
  text: "var(--c-text)",
  textMuted: "var(--c-text-muted)",
  accent: "var(--c-accent)",
  border: "var(--c-border)",
  borderLight: "var(--c-border-light)",

  /** Inverted surface — always dark bg + light text in both modes */
  headerBg: "var(--c-header-bg)",
  headerText: "var(--c-header-text)",
} as const;
