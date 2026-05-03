"use client";

import { useCallback } from "react";
import { useChatTransport } from "../transport-context";
import type { ExportFormat } from "../../types";

export function useExportThread() {
  const transport = useChatTransport();
  return useCallback(
    async (threadId: string, format: ExportFormat) => {
      const blob = await transport.exportThread(threadId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext =
        format === "json"
          ? "json"
          : format === "markdown"
            ? "md"
            : "replay.json";
      a.download = `wikipefia-chat-${threadId.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    [transport],
  );
}
