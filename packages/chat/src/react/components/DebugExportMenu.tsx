"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import { IconButton, Menu, MenuItem } from "@wikipefia/ui";
import { useExportThread } from "../hooks/use-export";
import type { ExportFormat } from "../../types";

interface DebugExportMenuProps {
  threadId: string;
}

const FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: "json", label: "JSON", description: "Full structured dump" },
  { id: "markdown", label: "Markdown", description: "Human-readable transcript" },
  { id: "replay", label: "Replay JSON", description: "Re-feedable to generateText" },
];

export function DebugExportMenu({ threadId }: DebugExportMenuProps) {
  const exportThread = useExportThread();

  return (
    <Menu
      align="right"
      className="min-w-[220px]"
      trigger={({ toggle }) => (
        <IconButton
          aria-label="Debug export"
          title="Debug — download thread"
          size="icon-sm"
          variant="ghost"
          onClick={toggle}
        >
          ⬇
        </IconButton>
      )}
    >
      {({ close }) => (
        <>
          <div
            className="px-3 py-1.5 border-b text-[10px] font-bold uppercase tracking-wider"
            style={{
              borderColor: C.borderLight,
              backgroundColor: C.headerBg,
              color: C.headerText,
              fontFamily: "var(--font-mono)",
            }}
          >
            Export thread
          </div>
          {FORMATS.map((f) => (
            <MenuItem
              key={f.id}
              onClick={async () => {
                close();
                await exportThread(threadId, f.id);
              }}
              style={{ color: C.text }}
            >
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {f.label}
              </div>
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
              >
                {f.description}
              </div>
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}
