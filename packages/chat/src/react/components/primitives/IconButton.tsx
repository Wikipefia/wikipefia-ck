"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button, type ButtonProps } from "./Button";

export interface IconButtonProps extends Omit<ButtonProps, "iconOnly"> {
  "aria-label": string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(props, ref) {
    return <Button ref={ref} {...props} iconOnly />;
  },
);
