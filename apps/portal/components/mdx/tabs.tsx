"use client";

import { useState, type ReactNode, Children } from "react";
import { C } from "@/lib/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = { props: Record<string, any> };

interface TabProps {
  label: string;
  children: ReactNode;
}

interface TabsProps {
  children: ReactNode;
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

export function Tabs({ children }: TabsProps) {
  const [active, setActive] = useState(0);

  // Extract Tab children and their labels
  const tabs: { label: string; content: ReactNode }[] = [];
  Children.forEach(children, (child) => {
    if (
      child &&
      typeof child === "object" &&
      "props" in child &&
      (child as AnyElement).props?.label
    ) {
      tabs.push({
        label: (child as AnyElement).props.label,
        content: (child as AnyElement).props.children,
      });
    }
  });

  if (tabs.length === 0) return null;

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      {/* Tab bar */}
      <div
        className="flex border-b-2 overflow-x-auto"
        style={{ borderColor: C.border, backgroundColor: C.bg }}
      >
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="relative px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-colors cursor-pointer"
            style={{
              fontFamily: "var(--font-mono)",
              color: active === i ? C.text : C.textMuted,
              backgroundColor: active === i ? C.bgWhite : "transparent",
              borderRight:
                i < tabs.length - 1 ? `1px solid ${C.borderLight}` : "none",
            }}
          >
            {tab.label}
            {/* Active indicator */}
            {active === i && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ backgroundColor: C.accent }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="p-4 pb-0 text-[14px] leading-[1.75]"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {tabs[active]?.content}
      </div>
    </div>
  );
}
