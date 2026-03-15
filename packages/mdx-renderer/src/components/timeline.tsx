import { Children, type ReactNode } from "react";
import { C } from "../theme";

type AnyElement = { props: Record<string, any> };

interface TimelineEventProps {
  date: string;
  title: string;
  color?: string;
  children?: ReactNode;
}

export function TimelineEvent({ children }: TimelineEventProps) {
  return <>{children}</>;
}

interface TimelineProps {
  title?: string;
  children: ReactNode;
}

export function Timeline({ title, children }: TimelineProps) {
  const events: (TimelineEventProps & { content: ReactNode })[] = [];

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("props" in child)) return;
    const p = (child as AnyElement).props;
    if (typeof p.date === "string" && typeof p.title === "string") {
      events.push({
        date: p.date,
        title: p.title,
        color: p.color,
        content: p.children,
      });
    }
  });

  if (events.length === 0) return null;

  return (
    <div className="mb-6 border-2" style={{ borderColor: C.border }}>
      {title && (
        <div
          className="px-4 py-2.5 border-b-2"
          style={{ borderColor: C.border, backgroundColor: C.headerBg }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: C.headerText }}
          >
            ■ {title}
          </span>
        </div>
      )}

      <div className="px-4 py-4" style={{ backgroundColor: C.bgWhite }}>
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          const dotColor = ev.color || C.accent;

          return (
            <div key={i} className="flex gap-4">
              <div
                className="shrink-0 w-16 text-right pt-0.5"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: C.text }}
                >
                  {ev.date}
                </span>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-3 h-3 border-2 mt-1 shrink-0"
                  style={{
                    borderColor: dotColor,
                    backgroundColor: dotColor,
                  }}
                />
                {!isLast && (
                  <div
                    className="w-px flex-1 min-h-6"
                    style={{ backgroundColor: C.borderLight }}
                  />
                )}
              </div>

              <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
                <p
                  className="text-[12px] font-bold uppercase tracking-[0.08em] mb-1"
                  style={{ fontFamily: "var(--font-mono)", color: C.text }}
                >
                  {ev.title}
                </p>
                {ev.content && (
                  <div
                    className="text-[13px] leading-[1.7]"
                    style={{ fontFamily: "var(--font-serif)", color: C.textMuted }}
                  >
                    {ev.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
