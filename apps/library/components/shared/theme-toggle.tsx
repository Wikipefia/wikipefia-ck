"use client";

import { useTheme } from "@/components/shared/theme-provider";
import { C } from "@/lib/theme";

/** Small icon button that flips light/dark, styled for the dark masthead. */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light" : "Switch to dark"}
      className="flex h-7 w-7 items-center justify-center border transition-colors"
      style={{ borderColor: "rgba(255,255,255,0.18)", color: C.headerText }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.color = C.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
        e.currentTarget.style.color = C.headerText;
      }}
    >
      <span key={resolvedTheme} className="spin-once text-[13px] leading-none">
        {isDark ? "☼" : "☾"}
      </span>
    </button>
  );
}
