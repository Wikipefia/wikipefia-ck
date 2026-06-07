"use client";

import { C } from "@wikipefia/mdx-renderer/theme";
import { Button, Menu, MenuItem } from "@wikipefia/ui";
import type { ModelDef } from "../../types";

interface ModelPickerProps {
  models: ModelDef[];
  currentId: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelPicker({
  models,
  currentId,
  onSelect,
  disabled,
}: ModelPickerProps) {
  const current = models.find((m) => m.id === currentId) ?? models[0];

  return (
    <Menu
      align="right"
      className="min-w-[260px]"
      trigger={({ open, toggle }) => (
        <Button type="button" onClick={toggle} disabled={disabled}>
          <span style={{ color: C.textMuted }}>◇</span>
          {current.label}
          <span style={{ color: C.textMuted }}>{open ? "▴" : "▾"}</span>
        </Button>
      )}
    >
      {({ close }) =>
        models.map((m) => {
          const selected = m.id === currentId;
          return (
            <MenuItem
              key={m.id}
              selected={selected}
              onClick={() => {
                onSelect(m.id);
                close();
              }}
              style={{ color: C.text }}
            >
              <div
                className="text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {selected ? "● " : "○ "}
                {m.label}
              </div>
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
              >
                {m.provider} · {m.contextWindow.toLocaleString()} ctx
                {m.supportsImages ? " · 🖼" : ""}
                {m.supportsPDF ? " · 📄" : ""}
              </div>
            </MenuItem>
          );
        })
      }
    </Menu>
  );
}
