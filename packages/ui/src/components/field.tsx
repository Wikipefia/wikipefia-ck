import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";
import { Label } from "./label";

export interface FieldProps {
  label?: ReactNode;
  /** Helper text shown below the control. */
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** Vertical label + control + hint group used across editor/settings forms. */
export function Field({ label, hint, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint ? (
        <span
          className="text-[10px] leading-snug text-muted"
          style={{ fontFamily: font.serif }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
