"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const inputVariants = cva(
  "w-full border bg-surface text-fg outline-none transition-colors placeholder:text-muted focus:border-accent disabled:opacity-50",
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

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(inputVariants({ size }), className)}
      {...rest}
    />
  );
});
