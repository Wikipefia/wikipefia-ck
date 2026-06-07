import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

/** Thin divider line. */
export function Separator({
  orientation = "horizontal",
  className,
  ...rest
}: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-line-soft",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className,
      )}
      {...rest}
    />
  );
}
