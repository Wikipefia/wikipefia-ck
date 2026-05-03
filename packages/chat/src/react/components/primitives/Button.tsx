"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  iconOnly?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", iconOnly = false, className, children, style, ...rest },
  ref,
) {
  const heightClass = size === "sm" ? "h-[28px]" : "h-[34px]";
  const widthClass = iconOnly
    ? size === "sm"
      ? "w-[28px]"
      : "w-[34px]"
    : "px-3";

  const baseStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    borderColor: C.border,
    backgroundColor: variant === "primary" ? C.headerBg : C.bgWhite,
    color: variant === "primary" ? C.headerText : C.text,
    ...style,
  };

  if (variant === "ghost") {
    baseStyle.borderColor = "transparent";
    baseStyle.backgroundColor = "transparent";
  }
  if (variant === "danger") {
    baseStyle.borderColor = C.border;
    baseStyle.backgroundColor = C.bgWhite;
    baseStyle.color = "#DC2626";
  }

  return (
    <button
      ref={ref}
      className={[
        "border",
        heightClass,
        widthClass,
        "flex items-center justify-center gap-1.5",
        "text-[11px] font-bold uppercase tracking-[0.1em]",
        "transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        "hover:opacity-80 cursor-pointer",
        className ?? "",
      ].join(" ")}
      style={baseStyle}
      {...rest}
    >
      {children}
    </button>
  );
});
