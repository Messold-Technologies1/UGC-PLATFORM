"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_MS = 45_000;

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "audio/webm";
}

function getRecordingStartErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "Could not start recording. Check your microphone and try again.";
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Microphone permission is blocked. Allow microphone access in your browser settings, then try again.";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No microphone was found on this device.";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Your microphone is already in use by another app.";
  }

  if (error.name === "SecurityError") {
    return "Microphone recording requires a secure HTTPS or localhost page.";
  }

  if (error.name === "NotSupportedError") {
    return "Audio recording is not supported in this browser.";
  }

  return "Could not start recording. Check your microphone and try again.";
}

export type BrandPronunciationAudioFieldProps = {
  disabled?: boolean;
  uploading?: boolean;
  /** URL for <audio> (CDN or blob). */
  audioUrl: string | null;
  /** True when a clip exists (uploaded or saved). */
  hasRecording: boolean;
  onRecordingReady: (blob: Blob) => void;
  onRemove: () => void;
};

export function BrandPronunciationAudioField({
  disabled = false,
  uploading = false,
  audioUrl,
  hasRecording,
  onRecordingReady,
  onRemove,
}: BrandPronunciationAudioFieldProps) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mimeRef = useRef<string>("audio/webm");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const cleanupRecorder = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopStream();
  }, [stopStream]);

  useEffect(() => () => cleanupRecorder(), [cleanupRecorder]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.requestData();
      } catch {
        // ignore
      }
      mr.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error(
        window.isSecureContext
          ? "Recording is not supported in this browser."
          : "Microphone recording requires a secure HTTPS or localhost page.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMimeType();
      mimeRef.current = mimeType;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onerror = () => {
        toast.error("Recording failed.");
        setRecording(false);
        if (maxTimerRef.current) {
          clearTimeout(maxTimerRef.current);
          maxTimerRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        stopStream();
      };

      mr.onstop = () => {
        if (maxTimerRef.current) {
          clearTimeout(maxTimerRef.current);
          maxTimerRef.current = null;
        }
        const parts = chunksRef.current.slice();
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        stopStream();
        setRecording(false);

        const blob = new Blob(parts, {
          type: mimeRef.current.split(";")[0] || "audio/webm",
        });
        if (blob.size < 512) {
          toast.error("Recording too short. Try again.");
          return;
        }
        if (blob.size > MAX_BYTES) {
          toast.error("Recording must be 5 MB or smaller.");
          return;
        }
        onRecordingReady(blob);
      };

      mr.start(250);
      setRecording(true);

      maxTimerRef.current = setTimeout(() => {
        toast.message("Maximum length reached", {
          description: "Recording stopped automatically.",
        });
        stopRecording();
      }, MAX_MS);
    } catch (error) {
      toast.error(getRecordingStartErrorMessage(error));
      cleanupRecorder();
      setRecording(false);
    }
  }, [cleanupRecorder, onRecordingReady, stopRecording, stopStream]);

  const busy = disabled || uploading;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
      <p className="text-sm font-medium text-foreground">Voice pronunciation</p>
      <p className="text-xs text-muted-foreground">
        Optional short clip so creators hear how you say your brand name (max ~45s,
        5 MB).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => void startRecording()}
          >
            {hasRecording ? "Re-record" : "Record"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={stopRecording}
          >
            Stop
          </Button>
        )}
        {hasRecording ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy || recording}
            onClick={onRemove}
          >
            Remove audio
          </Button>
        ) : null}
        {uploading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Spinner className="size-3.5" aria-hidden />
            Uploading…
          </span>
        ) : null}
      </div>
      {recording ? (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Recording… speak clearly, then press Stop.
        </p>
      ) : null}
      {audioUrl ? (
        <audio
          key={audioUrl}
          controls
          src={audioUrl}
          className="h-9 w-full max-w-md"
          preload="metadata"
        />
      ) : null}
    </div>
  );
}
