"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Row of mutually-exclusive options (enum settings, locale switcher, view
 * filters). The selected option uses the inverted `primary` button style.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = "sm",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn("flex border border-line", className)}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Button
            key={opt.value}
            type="button"
            size={size}
            disabled={disabled}
            variant={active ? "primary" : "ghost"}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 border-0 tracking-[0.05em]",
              i > 0 && "border-l border-line",
              !active && "text-muted",
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
