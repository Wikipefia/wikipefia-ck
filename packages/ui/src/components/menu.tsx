"use client";

import {
  useState,
  useRef,
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { font } from "../lib/theme";

export interface MenuProps {
  /** Renders the trigger; receives the open state and a toggle handler. */
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  /** Renders the menu content; receives a `close` handler. */
  children: (state: { close: () => void }) => ReactNode;
  align?: "left" | "right";
  /** Extra classes for the menu list panel (e.g. `min-w-[260px]`). */
  className?: string;
}

/**
 * Dropdown menu primitive: a trigger plus a floating panel that closes on
 * outside-click. Powers the model/mode/export pickers.
 */
export function Menu({ trigger, children, align = "left", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 border border-line bg-surface shadow-xl",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  );
}

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** A single row inside a {@link Menu}. */
export function MenuItem({
  selected,
  className,
  style,
  ...rest
}: MenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "block w-full cursor-pointer border-b border-line-soft px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-bg disabled:opacity-50",
        selected && "bg-bg",
        className,
      )}
      style={{ fontFamily: font.mono, ...style }}
      {...rest}
    />
  );
}
