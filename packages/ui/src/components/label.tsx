import { forwardRef, type LabelHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

export const labelVariants = cva("block font-bold uppercase", {
  variants: {
    size: {
      sm: "text-[9px] tracking-[0.15em]",
      md: "text-[10px] tracking-[0.15em]",
    },
    tone: {
      muted: "text-muted",
      default: "text-fg",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "muted",
  },
});

export interface LabelProps
  extends LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

/** Section / form label in the brutalist monospace style. */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { size, tone, className, style, ...rest },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cn(labelVariants({ size, tone }), className)}
      style={{ fontFamily: font.mono, ...style }}
      {...rest}
    />
  );
});
