"use client";

import { cn } from "../lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** Track + thumb boolean toggle. Accent when on. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-[22px] w-[44px] shrink-0 border transition-colors cursor-pointer disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-line bg-surface",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[16px] w-[16px] transition-all",
          checked ? "left-[24px] bg-white" : "left-[2px] bg-fg",
        )}
      />
    </button>
  );
}
