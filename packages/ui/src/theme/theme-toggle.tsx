"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { IconButton, type IconButtonProps } from "../components/icon-button";
import { useTheme } from "./theme-provider";

export interface ThemeToggleProps extends Omit<IconButtonProps, "aria-label"> {
  "aria-label"?: string;
}

/**
 * Light/dark toggle button. Reads + writes the {@link ThemeProvider} context
 * and shows a sun (light) or filled dot (dark), matching the brutalist motif.
 */
export function ThemeToggle({
  variant = "outline",
  "aria-label": ariaLabel = "Toggle theme",
  onClick,
  ...rest
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Until mounted, `resolvedTheme` is still the provider default, so render a
  // disabled placeholder rather than risk showing the wrong icon / toggling.
  if (!mounted) {
    return (
      <IconButton variant={variant} aria-label={ariaLabel} disabled {...rest}>
        <span />
      </IconButton>
    );
  }

  return (
    <IconButton
      variant={variant}
      aria-label={ariaLabel}
      {...rest}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        toggleTheme();
        onClick?.(event);
      }}
    >
      <span key={resolvedTheme} className="theme-toggle-icon">
        {resolvedTheme === "dark" ? "●" : "☀"}
      </span>
    </IconButton>
  );
}
