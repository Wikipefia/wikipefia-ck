"use client";

import { api } from "@wikipefia/convex/api";
import type { Id } from "@wikipefia/convex/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { FONT } from "@/lib/theme";

/**
 * Interactive 1–5 star rating. Shows the current average; clicking a star
 * appends a rating event (no per-user dedup in v1). Updates reactively.
 */
export function RatingStars({
  fileId,
  ratingAvg,
  ratingCount,
}: {
  fileId: Id<"libraryFiles">;
  ratingAvg: number;
  ratingCount: number;
}) {
  const rate = useMutation(api.library.ratings.rate);
  const [hover, setHover] = useState(0);

  async function submitRating(value: number) {
    try {
      await rate({ fileId, value });
    } catch {
      // Swallow — a failed rating just doesn't register; nothing to undo.
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover reset is presentational; controls are the nested buttons. */}
      <div className="flex items-center" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = hover ? star <= hover : star <= Math.round(ratingAvg);
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHover(star)}
              onClick={() => submitRating(star)}
              className="cursor-pointer px-0.5 text-2xl leading-none transition-transform hover:scale-110"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <span style={{ color: filled ? "#f59e0b" : "var(--c-border)" }}>
                ★
              </span>
            </button>
          );
        })}
      </div>
      <span
        className="text-[11px] uppercase tracking-[0.12em] text-muted"
        style={{ fontFamily: FONT.mono }}
      >
        {ratingAvg > 0 ? ratingAvg.toFixed(1) : "—"}
        {ratingCount > 0 &&
          ` · ${ratingCount} vote${ratingCount > 1 ? "s" : ""}`}
      </span>
    </div>
  );
}
