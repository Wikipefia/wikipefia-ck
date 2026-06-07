import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FONT } from "@/lib/theme";

/**
 * Shared styled primitives in the Wikipefia house style: sharp corners, thin
 * borders, tiny uppercase mono labels, blue accent on hover. Layout via
 * Tailwind arbitrary CSS-var utilities; font family via inline style.
 */

const mono = { fontFamily: FONT.mono };

/** Tiny uppercase tracked label used above fields / as section eyebrows. */
export function MonoLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--c-text-muted)] ${className}`}
      style={mono}
    >
      {children}
    </span>
  );
}

/** Bordered 3-letter document-type code badge. */
export function TypeBadge({ code }: { code: string }) {
  return (
    <span
      className="inline-flex items-center border border-[var(--c-accent)] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.18em] text-[var(--c-accent)]"
      style={mono}
    >
      {code}
    </span>
  );
}

type BtnVariant = "primary" | "outline" | "danger" | "ghost";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary:
    "border border-[var(--c-accent)] bg-[var(--c-accent)] text-white hover:opacity-90",
  outline:
    "border border-[var(--c-border)] bg-transparent text-[var(--c-text)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]",
  danger:
    "border border-[var(--c-border)] bg-transparent text-[var(--c-text-muted)] hover:border-red-500 hover:text-red-500",
  ghost: "bg-transparent text-[var(--c-text-muted)] hover:text-[var(--c-text)]",
};

export function Btn({
  variant = "outline",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...props}
      style={mono}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BTN_VARIANT[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Filter / tag pill with an active state. */
export function Pill({
  active = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      style={mono}
      className={`cursor-pointer border px-2.5 py-1 text-[10px] tracking-wide transition-colors ${
        active
          ? "border-[var(--c-accent)] bg-[var(--c-accent)] text-white"
          : "border-[var(--c-border-light)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
      }`}
    >
      {children}
    </button>
  );
}

/** Shared input/select/textarea class. Apply with `style={inputStyle}`. */
export const inputCls =
  "w-full border border-[var(--c-border)] bg-[var(--c-bg-white)] px-3 py-2 text-[13px] text-[var(--c-text)] outline-none transition-colors focus:border-[var(--c-accent)] placeholder:text-[var(--c-text-muted)]";
export const inputStyle = mono;

/** Labeled field wrapper. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is nested via `children`.
    <label className="block space-y-1.5">
      <MonoLabel>{label}</MonoLabel>
      {children}
    </label>
  );
}

/**
 * Primary submit button with an inner progress fill. `progress` is 0–100; when
 * > 0 a translucent bar sweeps across to visualize upload completion.
 */
export function ProgressButton({
  progress,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { progress: number }) {
  return (
    <button
      {...props}
      style={mono}
      className={`relative inline-flex cursor-pointer items-center justify-center overflow-hidden border border-[var(--c-accent)] bg-[var(--c-accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {progress > 0 && (
        <span
          className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

/** Section heading with a hairline rule, used on the detail page. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <MonoLabel>{children}</MonoLabel>
      <span className="h-px flex-1 bg-[var(--c-border-light)]" />
    </div>
  );
}
