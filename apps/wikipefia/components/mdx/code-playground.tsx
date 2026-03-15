"use client";

import { useState, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { C } from "@/lib/theme";

interface CodePlaygroundProps {
  language?: string;
  /** Pass code as a prop string (preferred — preserves formatting). */
  code?: string;
  /** Fallback: children rendered by MDX (may lose formatting). */
  children?: ReactNode;
}

/** Recursively extract text from React node tree. */
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props: Record<string, unknown> }).props;
    return extractText(props.children as ReactNode);
  }
  return "";
}

export function CodePlayground({
  language = "python",
  code: codeProp,
  children,
}: CodePlaygroundProps) {
  // Prefer the `code` prop; fall back to extracting text from children
  const initialCode = (codeProp ?? extractText(children)).trim();
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("common");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleReset = () => {
    setCode(initialCode);
  };

  const lineCount = code.split("\n").length;

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            {t("playground")}
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 border"
            style={{
              fontFamily: "var(--font-mono)",
              color: C.textMuted,
              borderColor: C.borderLight,
            }}
          >
            {language}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {code !== initialCode && (
            <button
              onClick={handleReset}
              className="px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] border cursor-pointer transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                color: C.textMuted,
                borderColor: C.borderLight,
              }}
            >
              {t("reset")}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] border cursor-pointer transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              color: copied ? "#22863a" : C.textMuted,
              borderColor: copied ? "#22863a" : C.borderLight,
            }}
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </div>

      {/* Code editor area */}
      <div className="relative flex" style={{ backgroundColor: C.bg }}>
        {/* Line numbers */}
        <div
          className="shrink-0 select-none py-3 pr-2 text-right border-r"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            lineHeight: "1.6",
            color: C.borderLight,
            borderColor: C.borderLight,
            minWidth: "3rem",
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="px-2">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full resize-none py-3 px-3 outline-none bg-transparent"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            lineHeight: "1.6",
            color: C.text,
            tabSize: 4,
            minHeight: `${Math.max(lineCount * 19.2 + 24, 80)}px`,
          }}
        />
      </div>

      {/* Footer hint */}
      <div
        className="px-3 py-1.5 border-t text-[9px] uppercase tracking-[0.15em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: C.textMuted,
          borderColor: C.borderLight,
          backgroundColor: C.bg,
        }}
      >
        {t("editableHint")}
      </div>
    </div>
  );
}
