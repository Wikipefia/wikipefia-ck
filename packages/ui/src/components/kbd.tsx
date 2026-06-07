import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

/** A keyboard-key hint, e.g. `⌘K`, `esc`, `↑↓`. */
export function Kbd({ className, style, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center border border-line-soft px-1 py-px text-[10px] leading-none text-muted",
        className,
      )}
      style={{ fontFamily: font.mono, ...style }}
      {...rest}
    />
  );
}
