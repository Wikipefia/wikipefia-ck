import type { ComponentType, AnchorHTMLAttributes, ReactNode } from "react";
import { C } from "./theme";

type AnyProps = Record<string, any>;

interface TypographyOptions {
  /** Custom link component (e.g. Next.js Link). Falls back to <a>. */
  Link?: ComponentType<AnyProps>;
}

/**
 * Creates styled HTML element overrides for MDX rendering.
 * Both apps share the same design; only the Link component differs.
 */
export function createTypography(options?: TypographyOptions): Record<string, ComponentType<any>> {
  const LinkComponent = options?.Link;

  return {
    h1: ({ children, id, ...props }: AnyProps) => (
      <h1 id={id} className="text-3xl md:text-4xl font-bold uppercase mb-6 scroll-mt-24 tracking-tighter" {...props}>{children}</h1>
    ),
    h2: ({ children, id, ...props }: AnyProps) => (
      <h2 id={id} className="text-2xl font-bold uppercase mt-10 mb-4 scroll-mt-20" {...props}>{children}</h2>
    ),
    h3: ({ children, id, ...props }: AnyProps) => (
      <h3 id={id} className="text-lg font-bold uppercase mt-8 mb-3 scroll-mt-20" style={{ color: C.text }} {...props}>{children}</h3>
    ),
    h4: ({ children, id, ...props }: AnyProps) => (
      <h4 id={id} className="text-base font-bold uppercase mt-6 mb-2 scroll-mt-20" {...props}>{children}</h4>
    ),
    p: ({ children, ...props }: AnyProps) => (
      <p className="text-[16px] leading-[1.85] mb-5" style={{ color: C.text, fontFamily: "var(--font-mono)" }} {...props}>{children}</p>
    ),
    pre: ({ children, ...props }: AnyProps) => (
      <pre className="overflow-x-auto rounded-none border mb-6 text-sm leading-relaxed" style={{ backgroundColor: C.bg, borderColor: C.borderLight }} {...props}>{children}</pre>
    ),
    code: ({ children, className, ...props }: AnyProps) => {
      if (!className) {
        return (
          <code className="px-1.5 py-0.5 text-[14px] font-mono border" style={{ backgroundColor: C.bg, borderColor: C.borderLight, color: C.text }} {...props}>{children}</code>
        );
      }
      return <code className={`${className} block px-4 py-3`} {...props}>{children}</code>;
    },
    a: ({ href, children, ...props }: AnyProps) => {
      const isExternal = href?.startsWith("http");
      const linkClass = "underline underline-offset-2 decoration-1 hover:decoration-2 transition-all";
      const linkStyle = { color: C.accent, textDecorationColor: C.borderLight };

      if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass} style={linkStyle} {...props}>{children}</a>;
      }
      if (LinkComponent) {
        return <LinkComponent href={href || "#"} className={linkClass} style={linkStyle} {...props}>{children}</LinkComponent>;
      }
      return <a href={href || "#"} className={linkClass} style={linkStyle} {...props}>{children}</a>;
    },
    ul: ({ children, ...props }: AnyProps) => (
      <ul className="mb-6 space-y-2 ml-4 list-none" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: AnyProps) => (
      <ol className="mb-6 space-y-2 ml-4 list-none" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: AnyProps) => (
      <li className="text-[15px] leading-[1.75] pl-3" style={{ color: C.text, fontFamily: "var(--font-mono)", borderLeft: `2px solid ${C.borderLight}` }} {...props}>{children}</li>
    ),
    blockquote: ({ children, ...props }: AnyProps) => (
      <blockquote className="border-l-4 px-4 py-3 mb-6 text-[14px] leading-[1.75]" style={{ borderLeftColor: C.borderLight, backgroundColor: "rgba(0, 0, 0, 0.02)", color: C.textMuted, fontFamily: "var(--font-mono)" }} {...props}>{children}</blockquote>
    ),
    table: ({ children, ...props }: AnyProps) => (
      <div className="overflow-x-auto mb-6 border" style={{ borderColor: C.borderLight }}>
        <table className="w-full text-[14px]" {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }: AnyProps) => (
      <thead className="text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: C.headerBg, color: C.headerText }} {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: AnyProps) => (
      <th className="px-3 py-2 text-left" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: AnyProps) => (
      <td className="px-3 py-2 border-t" style={{ borderColor: C.borderLight, color: C.text }} {...props}>{children}</td>
    ),
    hr: () => (
      <hr className="my-8" style={{ borderColor: C.borderLight, borderStyle: "dashed" }} />
    ),
    strong: ({ children, ...props }: AnyProps) => (
      <strong className="font-bold" style={{ color: C.text }} {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: AnyProps) => (
      <em className="italic" {...props}>{children}</em>
    ),
  };
}
