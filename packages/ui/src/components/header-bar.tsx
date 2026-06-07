"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

export interface HeaderBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Leading glyph/emoji. Defaults to "■" when omitted. */
  icon?: string;
  title: string;
  /** Right-aligned slot (actions, badges). */
  right?: ReactNode;
}

/**
 * Inverted-surface header used in content-block cards, widget headers and
 * chat message headers. Matches the Wikipefia brutalist design system.
 */
export function HeaderBar({
  icon,
  title,
  right,
  className,
  ...rest
}: HeaderBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b-2 border-line bg-invert px-4 py-2.5",
        className,
      )}
      {...rest}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em] text-invert-fg"
        style={{ fontFamily: font.mono }}
      >
        {icon ? `${icon} ` : "■ "}
        {title}
      </span>
      {right ? (
        <span className="flex items-center gap-2 text-invert-fg">{right}</span>
      ) : null}
    </div>
  );
}
