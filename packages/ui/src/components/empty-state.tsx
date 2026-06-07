import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

/** Centered placeholder for empty lists / no-results states. */
export function EmptyState({
  className,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-5 py-10 text-center text-[12px] uppercase tracking-wider text-muted",
        className,
      )}
      style={{ fontFamily: font.mono, ...style }}
      {...rest}
    />
  );
}
