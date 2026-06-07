import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Label } from "./label";
import { Separator } from "./separator";

export interface SectionHeadingProps {
  children: ReactNode;
  className?: string;
}

/** A small uppercase {@link Label} followed by a hairline rule. */
export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-3 flex items-center gap-3", className)}>
      <Label className="shrink-0">{children}</Label>
      <Separator className="flex-1" />
    </div>
  );
}
