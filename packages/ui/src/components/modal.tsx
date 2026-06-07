"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name for the dialog (screen readers). */
  "aria-label"?: string;
  /** ID of an element that labels the dialog. */
  "aria-labelledby"?: string;
  /** Vertical placement of the dialog box. Defaults to "top". */
  align?: "top" | "center";
  /** Extra classes for the dialog box (e.g. `max-w-2xl`). */
  className?: string;
  /** Close when the backdrop is clicked. Defaults to true. */
  closeOnBackdrop?: boolean;
  /** Close when Escape is pressed. Defaults to true. */
  closeOnEscape?: boolean;
  /** z-index for the overlay. Defaults to 50. */
  zIndex?: number;
}

/**
 * Animated overlay + backdrop + dialog box. The building block behind the
 * portal search dialog, the studio project picker and any other modal.
 * Bring your own content (input, list, form) as children.
 */
export function Modal({
  open,
  onClose,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  align = "top",
  className,
  closeOnBackdrop = true,
  closeOnEscape = true,
  zIndex = 50,
}: ModalProps) {
  // Keep the latest onClose without re-registering the listener every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 flex justify-center",
            align === "top" ? "items-start pt-[12vh]" : "items-center",
          )}
          style={{ zIndex }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn(
              "relative mx-4 w-full max-w-2xl border-2 border-line bg-surface shadow-2xl",
              className,
            )}
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
