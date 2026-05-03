"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ChatLayout,
  ThreadView,
  useSessionId,
} from "@wikipefia/chat/react";
import { C } from "@wikipefia/mdx-renderer/theme";

export default function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  const router = useRouter();
  const sessionId = useSessionId();

  if (!sessionId) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ color: C.textMuted, fontFamily: "var(--font-mono)" }}
      >
        <span className="text-[10px] uppercase tracking-[0.15em]">Loading…</span>
      </div>
    );
  }

  return (
    <ChatLayout
      activeThreadId={threadId}
      onSelectThread={(id) => router.push(`/c/${id}`)}
      onNewThread={() => router.push("/")}
    >
      <ThreadView threadId={threadId} />
    </ChatLayout>
  );
}
