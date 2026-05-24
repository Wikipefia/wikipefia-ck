"use client";

import { type ReactNode } from "react";
import { ChatTransportProvider, useSessionId } from "@wikipefia/chat/react";
import { useConvexChatTransport } from "@wikipefia/chat/convex-transport";
import { api } from "@wikipefia/convex/api";
import { MODELS, DEFAULT_MODEL_ID } from "@/lib/models";

/**
 * Wires the Convex-backed transport to the chat UI. Lives inside
 * <ConvexClientProvider> so useQuery / useMutation are available.
 *
 * Identity is anonymous — a stable session id stored in localStorage
 * (see useSessionId). No login screen, no auth.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const userId = useSessionId();
  const transport = useConvexChatTransport({ api, userId });

  return (
    <ChatTransportProvider
      transport={transport}
      config={{
        models: MODELS,
        defaultModelId: DEFAULT_MODEL_ID,
        brand: {
          productName: "Wikipefia Chat",
          tagline: "AI tutor for university students",
        },
      }}
    >
      {children}
    </ChatTransportProvider>
  );
}
