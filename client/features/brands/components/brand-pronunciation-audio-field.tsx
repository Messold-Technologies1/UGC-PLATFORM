"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Mic, X } from "lucide-react";

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
    <div className="space-y-1">
      <label className="inline-flex items-center gap-1.5 text-[12.5px] !font-[800] !text-black font-['DM_Sans',ui-sans-serif,system-ui,sans-serif]">
        Voice Pronunciation
      </label>
      <div className="flex items-stretch h-[42px] rounded-[11px] border border-slate-200 hover:border-[#c8c2c5] dark:hover:border-[#c8c2c5] bg-white overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-[#3e76ef] focus-within:ring-[3px] focus-within:ring-[#3e76ef]/[0.13] dark:bg-slate-950 dark:border-slate-800">
        <div className="flex h-full items-center justify-center bg-[#f4f1f1] px-3 border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[#8b8489] shrink-0">
          <Mic className="size-4" />
        </div>
        
        <div className="flex-1 flex items-center justify-between px-3 h-full min-w-0">
          {!hasRecording && !recording ? (
             <span className="text-[14px] text-slate-400 font-medium truncate">Record how to say it...</span>
          ) : recording ? (
             <span className="text-[14px] text-amber-600 font-medium truncate animate-pulse">Recording...</span>
          ) : uploading ? (
             <span className="text-[14px] text-slate-500 font-medium flex items-center gap-2 truncate"><Spinner className="size-3.5" aria-hidden /> Uploading...</span>
          ) : (
             <span className="text-[14px] text-slate-900 dark:text-slate-100 font-medium truncate">Audio saved</span>
          )}

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {!recording ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void startRecording()}
                className="text-[13px] font-bold text-[#3e76ef] hover:text-[#2d5cc5] disabled:opacity-50 transition-colors"
              >
                {hasRecording ? "Re-record" : "Record"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={stopRecording}
                className="text-[13px] font-bold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                Stop
              </button>
            )}
            {hasRecording && !recording && (
              <button
                type="button"
                disabled={busy}
                onClick={onRemove}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center p-1"
                aria-label="Remove audio"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {audioUrl ? (
        <div className="mt-1">
          <audio
            key={audioUrl}
            controls
            src={audioUrl}
            className="h-8 w-full max-w-full"
            preload="metadata"
          />
        </div>
      ) : null}
    </div>
  );
}
