# `@wikipefia/ui`

Shared UI component library for all Wikipefia apps (Portal, Studio, Chat).

Holds the **interactive design-system primitives** — buttons, inputs, badges,
cards, modals, the theme provider — so every app renders the same brutalist
look. (MDX *content* components live in `@wikipefia/mdx-renderer`.)

## Setup (per app)

1. Add the dependency:

   ```jsonc
   // apps/<app>/package.json
   "dependencies": { "@wikipefia/ui": "workspace:*" }
   ```

2. Transpile it (it ships raw TS):

   ```ts
   // apps/<app>/next.config.ts
   transpilePackages: ["@wikipefia/ui", /* … */]
   ```

3. Import the stylesheet and register the source for Tailwind in `globals.css`:

   ```css
   @import "tailwindcss";
   @import "@wikipefia/ui/styles.css";
   @source "../../../packages/ui/src";
   ```

   `styles.css` is the single source of truth for the `--c-*` palette (light +
   dark) and maps it to Tailwind utilities (`bg-surface`, `text-fg`,
   `border-line`, `text-accent`, …).

## Usage

```tsx
import { Button, Badge, Input, Modal, ThemeProvider, ThemeToggle } from "@wikipefia/ui";

<Button variant="primary" size="md">Save</Button>
<Badge variant="accent">New</Badge>
```

## Components

| Component          | Purpose                                              |
| ------------------ | --------------------------------------------------- |
| `Button`           | Action button                                       |
| `IconButton`       | Square icon-only button                             |
| `Badge`            | Tag / status pill                                   |
| `Input` / `Textarea` / `Select` | Form controls                          |
| `Switch`           | Boolean toggle                                      |
| `SegmentedControl` | Mutually-exclusive option row (enum, locale, tabs)  |
| `Menu` / `MenuItem`| Outside-click dropdown                              |
| `Modal`            | Overlay + backdrop + dialog box                     |
| `Card`             | Bordered surface                                    |
| `HeaderBar`        | Inverted content-block / widget header              |
| `Label` / `Field`  | Form label + label/control/hint group              |
| `Kbd`              | Keyboard-key hint                                   |
| `Separator`        | Divider line                                        |
| `Spinner` / `Dots` | Loading ring / animated typing dots                 |
| `EmptyState`       | Centered no-results placeholder                     |
| `ThemeProvider` / `useTheme` / `ThemeToggle` | Light/dark theme        |

## Variants

Variants are powered by [`class-variance-authority`](https://cva.style). Each
variant-driven component re-exports its `*Variants` function for composition.

| Component   | Variants                                              | Sizes                              |
| ----------- | ----------------------------------------------------- | ---------------------------------- |
| `Button`    | default, primary, outline, ghost, danger              | sm, md, lg, icon, icon-sm          |
| `IconButton`| (Button variants)                                     | icon, icon-sm                      |
| `Badge`     | default, muted, accent, solid, success, danger, warning, outline | sm, md                  |
| `Input` / `Select` | —                                              | sm, md                             |
| `Label`     | tone: muted, default                                  | sm, md                             |
| `Card`      | default, strong, muted, plain                         | —                                  |

## Overrides

Keep the components consistent and lean. If a single app needs something very
specific, pass `className` (it wins via `tailwind-merge`) or compose locally in
that app — **don't** add app-specific variants to the shared component.
