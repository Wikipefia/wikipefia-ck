"use client";

import { forwardRef, type ReactNode } from "react";
import { IconButton as UIIconButton, type ButtonProps } from "@wikipefia/ui";

/**
 * Backwards-compatible wrapper over the shared {@link UIIconButton}. Keeps the
 * `size: "sm" | "md"` API that chat call sites use, mapping it onto the shared
 * icon sizes.
 */
export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  "aria-label": string;
  size?: "sm" | "md";
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ size, ...rest }, ref) {
    return (
      <UIIconButton ref={ref} size={size === "sm" ? "icon-sm" : "icon"} {...rest} />
    );
  },
);
