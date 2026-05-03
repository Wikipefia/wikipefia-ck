"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ChatTransport, ModelDef } from "../types";

/**
 * Configuration that the host app provides alongside a ChatTransport.
 * Kept as a single context so all UI components can read it without prop drilling.
 */
export interface ChatHostConfig {
  models: ModelDef[];
  /** Default model ID for new threads. Falls back to `models[0]`. */
  defaultModelId?: string;
  /** App-specific labels (e.g. for branding the empty state). */
  brand?: {
    productName: string;
    tagline?: string;
  };
}

interface ChatContextValue {
  transport: ChatTransport;
  config: ChatHostConfig;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatTransportProviderProps {
  transport: ChatTransport;
  config: ChatHostConfig;
  children: ReactNode;
}

export function ChatTransportProvider({
  transport,
  config,
  children,
}: ChatTransportProviderProps) {
  return (
    <ChatContext.Provider value={{ transport, config }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatTransport(): ChatTransport {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error(
      "useChatTransport must be used inside a <ChatTransportProvider>",
    );
  }
  return ctx.transport;
}

export function useChatConfig(): ChatHostConfig {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error(
      "useChatConfig must be used inside a <ChatTransportProvider>",
    );
  }
  return ctx.config;
}

/** Returns the default model definition, defaulting to first model in list. */
export function useDefaultModel(): ModelDef {
  const config = useChatConfig();
  const id = config.defaultModelId;
  return (
    config.models.find((m) => m.id === id) ??
    config.models.find((m) => m.defaultForNewThreads) ??
    config.models[0]
  );
}
