"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

export const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-1.5 border whitespace-nowrap",
    "font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer",
    "hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40",
  ),
  {
    variants: {
      variant: {
        /** Neutral surface button — the workhorse. */
        default: "border-line bg-surface text-fg",
        /** Inverted high-emphasis action. */
        primary: "border-invert bg-invert text-invert-fg",
        /** Bordered, transparent fill. */
        outline: "border-line bg-transparent text-fg",
        /** Borderless, transparent. */
        ghost: "border-transparent bg-transparent text-fg",
        /** Destructive action. */
        danger: "border-line bg-surface text-danger hover:bg-danger hover:text-invert-fg hover:border-danger",
      },
      size: {
        sm: "h-[28px] px-2.5 text-[10px]",
        md: "h-[34px] px-3 text-[11px]",
        lg: "h-[40px] px-4 text-[12px]",
        /** Square, icon-only. */
        icon: "h-[34px] w-[34px] text-[13px]",
        "icon-sm": "h-[28px] w-[28px] text-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, style, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      style={{ fontFamily: font.mono, ...style }}
      {...rest}
    />
  );
});
