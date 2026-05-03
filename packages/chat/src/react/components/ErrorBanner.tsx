"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import { Button } from "./primitives/Button";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      className="border-2 border-l-[6px] my-3 px-4 py-3 flex items-start justify-between gap-3"
      style={{
        borderColor: "#DC2626",
        backgroundColor: "rgba(220, 38, 38, 0.04)",
        color: C.text,
      }}
    >
      <div className="flex-1">
        <div
          className="text-[10px] uppercase font-bold tracking-[0.15em] mb-1"
          style={{ color: "#DC2626", fontFamily: "var(--font-mono)" }}
        >
          ✕ Error
        </div>
        <div className="text-[13px]" style={{ fontFamily: "var(--font-serif)" }}>
          {message}
        </div>
      </div>
      <div className="flex gap-2">
        {onRetry ? (
          <Button onClick={onRetry} size="sm">
            Retry
          </Button>
        ) : null}
        {onDismiss ? (
          <Button onClick={onDismiss} size="sm" variant="ghost">
            ✕
          </Button>
        ) : null}
      </div>
    </div>
  );
}
