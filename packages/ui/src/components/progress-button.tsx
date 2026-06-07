"use client";

import { forwardRef } from "react";
import { cn } from "../lib/cn";
import { Button, type ButtonProps } from "./button";

export interface ProgressButtonProps extends ButtonProps {
  /** 0–100. When > 0, a translucent fill sweeps across to show completion. */
  progress: number;
}

/**
 * A {@link Button} with an inner progress fill — for upload/save actions that
 * report determinate progress. Defaults to the `primary` variant.
 */
export const ProgressButton = forwardRef<
  HTMLButtonElement,
  ProgressButtonProps
>(function ProgressButton(
  { progress, children, className, variant = "primary", ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      className={cn("relative overflow-hidden", className)}
      {...rest}
    >
      {progress > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-accent/30 transition-[width] duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      )}
      <span className="relative">{children}</span>
    </Button>
  );
});
