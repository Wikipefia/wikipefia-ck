"use client";

import { use, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChatLayout,
  ThreadView,
  TopicListPanel,
  useSessionId,
  useThread,
  useMessages,
  useSubmitToolResponse,
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
    <ThreadPageInner
      threadId={threadId}
      onSelect={(id) => router.push(`/c/${id}`)}
      onNew={() => router.push("/")}
    />
  );
}

/**
 * Inner component — runs only after sessionId is ready (we early-return
 * above otherwise). Splits out so the `useThread` / `useMessages` hooks
 * have a stable component identity for Convex's reactive subscriptions.
 */
function ThreadPageInner({
  threadId,
  onSelect,
  onNew,
}: {
  threadId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const thread = useThread(threadId);
  const { messages } = useMessages(threadId);
  const submit = useSubmitToolResponse();

  const isTutorWithPlan =
    thread?.mode === "tutor" &&
    Array.isArray(thread.topicPlan) &&
    thread.topicPlan.length > 0;
  const planLocked =
    thread?.tutorPhase === "teaching" || thread?.tutorPhase === "completed";

  // Find the most recent unresolved PlanTopics tool-call (if any) so we
  // can wire up the "replan" button in the side panel: it submits to
  // that approval the same way the chat-side widget does.
  const pendingPlanTopicsApproval = useMemo(() => {
    if (!isTutorWithPlan) return null;
    if (planLocked) return null;
    // Walk messages from newest to oldest, find a tool-call PlanTopics
    // whose result hasn't arrived yet.
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const callPart = m.parts.find(
        (p) => p.type === "tool-call" && p.toolName === "PlanTopics",
      );
      if (!callPart || callPart.type !== "tool-call") continue;
      const hasResult = m.parts.some(
        (p) =>
          p.type === "tool-result" &&
          p.toolCallId === callPart.toolCallId,
      );
      if (hasResult) return null; // already resolved → no longer pending
      return {
        messageId: m.id,
        toolCallId: callPart.toolCallId,
        approvalId: callPart.approvalId ?? null,
      };
    }
    return null;
  }, [messages, isTutorWithPlan, planLocked]);

  const handleReplan = useCallback(
    async (instructions: string) => {
      if (!pendingPlanTopicsApproval) return;
      await submit(
        pendingPlanTopicsApproval.messageId,
        pendingPlanTopicsApproval.toolCallId,
        instructions.trim().length > 0
          ? { action: "replan", instructions: instructions.trim() }
          : { action: "replan" },
        pendingPlanTopicsApproval.approvalId,
      );
    },
    [submit, pendingPlanTopicsApproval],
  );

  // Right side panel (only for tutor threads that have an emitted plan).
  // We pass `onReplan` only while a PlanTopics approval is still pending —
  // once teaching has begun there's nothing to resolve.
  const rightPanel = useMemo(
    () =>
      isTutorWithPlan && thread?.topicPlan
        ? {
            title: "План обучения",
            subtitle: "Tutor mode",
            content: (
              <TopicListPanel
                threadId={threadId}
                topics={thread.topicPlan}
                locked={planLocked}
                onReplan={pendingPlanTopicsApproval ? handleReplan : undefined}
              />
            ),
          }
        : undefined,
    [
      isTutorWithPlan,
      thread?.topicPlan,
      threadId,
      planLocked,
      pendingPlanTopicsApproval,
      handleReplan,
    ],
  );

  return (
    <ChatLayout
      activeThreadId={threadId}
      onSelectThread={onSelect}
      onNewThread={onNew}
      rightPanel={rightPanel}
    >
      <ThreadView threadId={threadId} />
    </ChatLayout>
  );
}
