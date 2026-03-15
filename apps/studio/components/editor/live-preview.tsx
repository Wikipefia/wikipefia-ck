"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { run, type RunOptions } from "@mdx-js/mdx";
import * as jsxRuntime from "react/jsx-runtime";
import { mdxComponents } from "@/lib/mdx-components";
import { C } from "@/lib/theme";

interface LivePreviewProps {
  compiled: string | null;
  toc?: { id: string; text: string; depth: number }[];
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

function ErrorFallback({ error }: { error: string }) {
  return (
    <div className="p-6">
      <div className="border-2 mb-4" style={{ borderColor: "#DC2626" }}>
        <div
          className="px-4 py-2.5 border-b-2"
          style={{ borderColor: "#DC2626", backgroundColor: "#DC2626" }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: "#fff" }}
          >
            ■ RENDER ERROR
          </span>
        </div>
        <div
          className="p-4 text-[13px] leading-[1.7]"
          style={{ fontFamily: "var(--font-editor)", color: C.text }}
        >
          <pre className="whitespace-pre-wrap break-words">{error}</pre>
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ compiled }: { compiled: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<ComponentType<any> | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      try {
        const { default: MDXContent } = await run(compiled, {
          ...(jsxRuntime as unknown as RunOptions),
          baseUrl: typeof window !== "undefined" ? window.location.href : "",
        });
        if (!cancelled) {
          setContent(() => MDXContent);
          setRenderError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setRenderError(
            err instanceof Error ? err.message : String(err)
          );
          setContent(null);
        }
      }
    }

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [compiled]);

  if (renderError) {
    return <ErrorFallback error={renderError} />;
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          Rendering...
        </span>
      </div>
    );
  }

  const MDXContent = content;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="prose-wiki" style={{ color: C.text }}>
        <MDXContent components={mdxComponents} />
      </div>
    </div>
  );
}

export function LivePreview({ compiled, toc }: LivePreviewProps) {
  if (!compiled) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div
          className="text-[48px] leading-none opacity-10"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          ◇
        </div>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          Start typing to see preview
        </span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <PreviewContent compiled={compiled} />
    </div>
  );
}
