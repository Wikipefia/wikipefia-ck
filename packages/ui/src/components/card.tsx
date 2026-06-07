"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const cardVariants = cva("bg-surface", {
  variants: {
    variant: {
      /** Thin 1px border — default surface. */
      default: "border border-line",
      /** Heavy 2px border — the brutalist content-block look. */
      strong: "border-2 border-line",
      /** Subtle, recessed surface. */
      muted: "border border-line-soft bg-bg",
      /** No border. */
      plain: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...rest}
    />
  );
});
