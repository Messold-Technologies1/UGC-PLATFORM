"use client";

import { useCallback, useRef, useState } from "react";
import { RosyConfirmDialog } from "@/components/ui/rosy-confirm-dialog";

export interface RosyConfirmOptions {
  title?: string;
  description: string;
  hint?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function useRosyConfirmDialog() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [dialogState, setDialogState] = useState<RosyConfirmOptions | null>(
    null,
  );

  const confirm = useCallback((options: RosyConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialogState(options);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialogState(null);
  }, []);

  const dialog = (
    <RosyConfirmDialog
      open={dialogState !== null}
      title={dialogState?.title}
      description={dialogState?.description ?? ""}
      hint={dialogState?.hint}
      confirmLabel={dialogState?.confirmLabel}
      cancelLabel={dialogState?.cancelLabel}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, dialog };
}
