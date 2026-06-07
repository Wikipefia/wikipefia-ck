"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const selectVariants = cva(
  cn(
    "w-full border bg-surface text-fg outline-none transition-colors cursor-pointer",
    "focus:border-accent disabled:opacity-50",
  ),
  {
    variants: {
      size: {
        sm: "h-[28px] px-2 text-[11px]",
        md: "h-[34px] px-2.5 text-[12px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size, className, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(selectVariants({ size }), className)}
      {...rest}
    />
  );
});
