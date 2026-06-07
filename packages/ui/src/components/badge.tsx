"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 border font-bold uppercase tracking-[0.1em] leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-line bg-surface text-fg",
        muted: "border-line-soft bg-bg text-muted",
        accent: "border-accent bg-transparent text-accent",
        /** Filled accent. */
        solid: "border-invert bg-invert text-invert-fg",
        success: "border-success bg-transparent text-success",
        danger: "border-danger bg-transparent text-danger",
        warning: "border-warning bg-transparent text-warning",
        outline: "border-line bg-transparent text-muted",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[9px]",
        md: "px-2 py-0.5 text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant, size, className, style, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      style={{ fontFamily: font.mono, ...style }}
      {...rest}
    />
  );
});
