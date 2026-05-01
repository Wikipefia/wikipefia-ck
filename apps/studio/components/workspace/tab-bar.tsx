"use client";

import { C } from "@/lib/theme";
import type { OpenTab } from "@/lib/mock-data";

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-center h-9 border-b shrink-0 overflow-hidden"
      style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
    >
      <div className="flex items-center min-w-0 overflow-x-auto h-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className="relative flex items-center gap-1.5 px-3 h-full shrink-0 cursor-pointer transition-colors group"
              style={{
                backgroundColor: isActive ? C.bgWhite : "transparent",
                borderRight: `1px solid ${C.borderLight}`,
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = C.bgWhite;
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {tab.loading ? (
                <span
                  className="w-1.5 h-1.5 shrink-0 rounded-full animate-pulse"
                  style={{ backgroundColor: C.accent }}
                />
              ) : tab.modified ? (
                <span
                  className="w-1.5 h-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: C.accent }}
                />
              ) : null}
              {tab.type === "metadata" && (
                <span className="text-[10px]" style={{ color: C.textMuted }}>
                  &#x2699;
                </span>
              )}
              <span
                className="text-[10px] font-medium whitespace-nowrap"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: isActive ? C.text : C.textMuted,
                }}
              >
                {tab.label}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="text-[9px] ml-1 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: C.textMuted }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = C.text;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = C.textMuted;
                }}
              >
                &times;
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: C.accent }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
