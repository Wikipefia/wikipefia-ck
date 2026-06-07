"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full border bg-surface text-fg outline-none transition-colors",
          "px-2.5 py-1.5 text-[12px] leading-relaxed",
          "placeholder:text-muted focus:border-accent disabled:opacity-50",
          className,
        )}
        {...rest}
      />
    );
  },
);
