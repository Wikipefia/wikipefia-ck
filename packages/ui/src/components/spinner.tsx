import { cn } from "../lib/cn";

export interface SpinnerProps {
  className?: string;
}

/** Small indeterminate loading ring. */
export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent",
        className,
      )}
    />
  );
}
