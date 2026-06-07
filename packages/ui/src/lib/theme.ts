/**
 * Design tokens, CSS-variable backed.
 *
 * Prefer the Tailwind utilities (`bg-surface`, `text-fg`, `border-line`, …)
 * defined in `styles.css` for component styling. This object is for the cases
 * where an inline `style` is unavoidable (e.g. SVG fills, dynamic colors,
 * `fontFamily`). The values mirror the `--c-*` palette in `styles.css`.
 */
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

  danger: "var(--c-danger)",
  success: "var(--c-success)",
  warning: "var(--c-warning)",
} as const;

/** Shared font-family CSS variables (set by each app via next/font). */
export const font = {
  mono: "var(--font-mono)",
  serif: "var(--font-serif)",
  editor: "var(--font-editor)",
} as const;
