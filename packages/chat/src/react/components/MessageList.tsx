"use client";

import { useEffect, useRef } from "react";
import { C } from "@wikipefia/mdx-renderer/theme";
import type { ChatMessage } from "../../types";
import { Message } from "./Message";

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const initialScrollDoneRef = useRef(false);

  // First-render scroll-to-bottom: instant (no smooth animation), so opening
  // an existing thread lands you at the latest message immediately.
  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (messages.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    initialScrollDoneRef.current = true;
    lastIdRef.current = messages[messages.length - 1].id;
  }, [messages.length]);

  // Subsequent: when a new message arrives (different last-id), smooth scroll.
  useEffect(() => {
    if (!initialScrollDoneRef.current) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.id !== lastIdRef.current) {
      lastIdRef.current = last.id;
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
      >
        <span className="text-[10px] uppercase tracking-[0.15em]">Loading…</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      // pb-32: leave clearance for the floating MessageInput at the bottom.
      className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-32"
    >
      <div className="max-w-3xl mx-auto">
        {messages.map((m, i) => (
          <Message key={m.id} message={m} index={i} />
        ))}
      </div>
    </div>
  );
}
