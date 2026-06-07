"use client";

import { forwardRef } from "react";
import { Button, type ButtonProps } from "./button";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  "aria-label": string;
  size?: "icon" | "icon-sm";
}

/** A square, icon-only {@link Button}. Requires an accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ size = "icon", ...rest }, ref) {
    return <Button ref={ref} size={size} {...rest} />;
  },
);
