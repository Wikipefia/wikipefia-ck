"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "wikipefia-chat:session-id";

/**
 * Generates / retrieves a stable anonymous session ID stored in localStorage.
 * This identifies a browser session for thread scoping in the absence of auth.
 *
 * On first render the hook returns null (SSR-safe), then resolves to the ID
 * after mount. Components that need the ID should treat null as "loading".
 */
export function useSessionId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing && existing.length > 0) {
        setId(existing);
        return;
      }
      const fresh = generateSessionId();
      localStorage.setItem(STORAGE_KEY, fresh);
      setId(fresh);
    } catch {
      // localStorage unavailable (private mode, SSR, etc.) — fall back to a
      // per-tab ephemeral id. Threads created here won't persist across tabs.
      setId(generateSessionId());
    }
  }, []);
  return id;
}

function generateSessionId(): string {
  // Prefer crypto.randomUUID where available
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: a 22-char base36 random string
  return (
    "anon-" +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
}
