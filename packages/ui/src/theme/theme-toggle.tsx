"use client";

import { useEffect, useState } from "react";
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
  ...rest
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <IconButton
      variant={variant}
      onClick={toggleTheme}
      aria-label={ariaLabel}
      {...rest}
    >
      <span key={mounted ? resolvedTheme : "initial"} className="theme-toggle-icon">
        {resolvedTheme === "dark" ? "●" : "☀"}
      </span>
    </IconButton>
  );
}
