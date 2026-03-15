"use client";

import { useState, Children, type ReactNode } from "react";
import { useLabels } from "../labels";
import { safeEval } from "../math/safe-eval";
import { C } from "../theme";

type AnyElement = { props: Record<string, any> };

interface ValueProps {
  label: string;
  expr: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function Value(_: ValueProps) {
  return null;
}

interface ToggleProps {
  name: string;
  default?: boolean;
  label?: string;
}

export function Toggle(_: ToggleProps) {
  return null;
}

interface SliderDef {
  name: string;
  min?: number;
  max?: number;
  default?: number;
  step?: number;
  label?: string;
}

interface InteractiveProps {
  title?: string;
  children: ReactNode;
}

export function Interactive({ title, children }: InteractiveProps) {
  const t = useLabels();
  const sliderDefs: SliderDef[] = [];
  const toggleDefs: ToggleProps[] = [];
  const valueDefs: ValueProps[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;

    if (typeof p.expr === "string" && typeof p.label === "string") {
      valueDefs.push(p as ValueProps);
    } else if (
      typeof p.name === "string" &&
      (p.min !== undefined || p.max !== undefined)
    ) {
      sliderDefs.push(p as SliderDef);
    } else if (typeof p.name === "string") {
      toggleDefs.push(p as ToggleProps);
    }
  });

  const [vars, setVars] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    for (const s of sliderDefs) v[s.name] = s.default ?? 0;
    for (const tg of toggleDefs)
      v[tg.name] = tg.default !== undefined ? (tg.default ? 1 : 0) : 0;
    return v;
  });

  const computedValues = valueDefs.map((vd) => {
    const raw = safeEval(vd.expr, vars);
    if (!isFinite(raw)) return { label: vd.label, value: "—" };
    const decimals = vd.decimals ?? 2;
    const formatted = `${vd.prefix ?? ""}${raw.toFixed(decimals)}${vd.suffix ?? ""}`;
    return { label: vd.label, value: formatted };
  });

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b-2"
        style={{ borderColor: C.border, backgroundColor: C.headerBg }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
        >
          ▣ {title || t.interactive}
        </span>
        <span
          className="text-[9px] uppercase tracking-[0.1em]"
          style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
        >
          {sliderDefs.length + toggleDefs.length}{" "}
          {sliderDefs.length + toggleDefs.length !== 1 ? t.controls : t.control}
        </span>
      </div>

      {(sliderDefs.length > 0 || toggleDefs.length > 0) && (
        <div
          className="px-4 py-3 space-y-3"
          style={{ backgroundColor: C.bgWhite }}
        >
          {sliderDefs.map((s) => {
            const val = vars[s.name] ?? s.default ?? 0;
            const step = s.step ?? 0.1;
            const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;

            return (
              <div key={s.name} className="flex items-center gap-3">
                <label
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] min-w-28"
                  style={{ fontFamily: "var(--font-mono)", color: C.text }}
                >
                  {s.label || s.name}
                </label>
                <input
                  type="range"
                  min={s.min ?? 0}
                  max={s.max ?? 100}
                  step={step}
                  value={val}
                  onChange={(e) =>
                    setVars((p) => ({
                      ...p,
                      [s.name]: parseFloat(e.target.value),
                    }))
                  }
                  className="flex-1 h-1.5 cursor-pointer accent-blue-600"
                />
                <span
                  className="shrink-0 text-[11px] font-bold tabular-nums w-16 text-right"
                  style={{ fontFamily: "var(--font-mono)", color: C.accent }}
                >
                  {val.toFixed(decimals)}
                </span>
              </div>
            );
          })}

          {toggleDefs.map((toggle) => {
            const isOn = !!(vars[toggle.name] ?? 0);

            return (
              <div key={toggle.name} className="flex items-center gap-3">
                <span
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] min-w-28"
                  style={{ fontFamily: "var(--font-mono)", color: C.text }}
                >
                  {toggle.label || toggle.name}
                </span>
                <button
                  onClick={() =>
                    setVars((p) => ({
                      ...p,
                      [toggle.name]: p[toggle.name] ? 0 : 1,
                    }))
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 border-2 cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-[0.1em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderColor: isOn ? C.border : C.borderLight,
                    backgroundColor: isOn ? C.headerBg : "transparent",
                    color: isOn ? C.headerText : C.textMuted,
                  }}
                >
                  <span
                    className="inline-block w-2 h-2"
                    style={{ backgroundColor: isOn ? C.accent : C.borderLight }}
                  />
                  {isOn ? t.on : t.off}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {computedValues.length > 0 && (
        <div
          className="border-t-2"
          style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
        >
          {computedValues.map((cv, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-2.5"
              style={{
                borderTop: i > 0 ? `1px solid ${C.borderLight}` : undefined,
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ fontFamily: "var(--font-mono)", color: C.textMuted }}
              >
                {cv.label}
              </span>
              <span
                className="text-[15px] font-bold tabular-nums"
                style={{ fontFamily: "var(--font-mono)", color: C.text }}
              >
                {cv.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
