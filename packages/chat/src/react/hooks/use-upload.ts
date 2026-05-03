"use client";

import { useCallback, useState } from "react";
import { useChatTransport } from "../transport-context";
import type { AttachmentRef } from "../../types";

export interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

export function useUploadFile() {
  const transport = useChatTransport();
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File): Promise<AttachmentRef | null> => {
      setState({ uploading: true, progress: 0, error: null });
      try {
        const ref = await transport.uploadFile(file);
        setState({ uploading: false, progress: 1, error: null });
        return ref;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ uploading: false, progress: 0, error: message });
        return null;
      }
    },
    [transport],
  );

  return { upload, ...state };
}
