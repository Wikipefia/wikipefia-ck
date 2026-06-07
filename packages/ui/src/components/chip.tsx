"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected state — fills with accent. */
  active?: boolean;
}

/**
 * Small toggleable chip for filters and tags. Unlike {@link Badge} it is
 * interactive (a button) and not uppercased, so it suits free-form tag values.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { active = false, className, style, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      className={cn(
        "cursor-pointer border px-2.5 py-1 text-[10px] tracking-wide transition-colors",
        active
          ? "border-accent bg-accent text-white"
          : "border-line-soft text-muted hover:border-accent hover:text-accent",
        className,
      )}
      style={{ fontFamily: font.mono, ...style }}
      {...rest}
    />
  );
});
