"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import {
  Copy,
  Flag,
  Loader2,
  MoreHorizontal,
  Mic,
  Reply,
  Send,
  Square,
  Trash2,
  UserMinus2,
  ArrowLeft,
  CheckCheck,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type StatusType = "online" | "dnd" | "offline";

export type MessageDeliveryStatus = "sending" | "sent" | "read" | "failed";

export type MessagingParticipant = {
  id: string;
  name: string;
  avatar?: string | null;
  status?: StatusType;
  roleLabel?: string;
};

export type MessagingConversationMessage = {
  id: string;
  type?: "TEXT" | "VOICE";
  text?: string | null;
  audioUrl?: string | null;
  audioDurationMs?: number | null;
  audioMimeType?: string | null;
  senderUserId: string;
  createdAt?: string;
  timeLabel?: string;
  /** @deprecated Prefer deliveryStatus for outgoing tick UI */
  statusLabel?: string;
  deliveryStatus?: MessageDeliveryStatus;
};

function MessageDeliveryTicks({
  status,
}: {
  status?: MessagingConversationMessage["deliveryStatus"];
}) {
  if (!status) return null;

  if (status === "failed") {
    return <span className="text-destructive">Failed</span>;
  }

  if (status === "sending") {
    return (
      <Loader2
        className="size-3 animate-spin opacity-70"
        aria-label="Sending"
      />
    );
  }

  return (
    <CheckCheck
      className={cn(
        "size-3.5 shrink-0",
        status === "read"
          ? "text-sky-500 dark:text-sky-400"
          : "text-muted-foreground/80",
      )}
      aria-label={status === "read" ? "Read" : "Sent"}
    />
  );
}

type SendVoiceMessagePayload = {
  blob: Blob;
  audioDurationMs: number;
  contentType: string;
};

type MessagingConversationProps = {
  className?: string;
  messages?: MessagingConversationMessage[];
  participants?: MessagingParticipant[];
  alignRightUserId?: string;
  headerTitle?: string;
  headerSubtitle?: string | null;
  headerAvatarUrl?: string | null;
  hideHeaderAvatar?: boolean;
  readOnly?: boolean;
  showSenderNames?: boolean;
  emptyState?: string;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  sendError?: string | null;
  inputPlaceholder?: string;
  maxMessageLength?: number;
  onSendMessage?: (text: string) => Promise<void> | void;
  onSendVoiceMessage?: (payload: SendVoiceMessagePayload) => Promise<void> | void;
  maxVoiceDurationMs?: number;
  onBack?: () => void;
};


function initials(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function formatMessageTime(message: MessagingConversationMessage) {
  if (message.timeLabel) return message.timeLabel;
  if (!message.createdAt) return "";

  const date = new Date(message.createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat("en-US", {
    month: isToday ? undefined : "short",
    day: isToday ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status?: StatusType) {
  if (status === "online") return "Online Now";
  if (status === "dnd") return "Do Not Disturb";
  if (status === "offline") return "Offline";
  return "";
}

function formatVoiceDuration(durationMs?: number | null) {
  if (!durationMs || durationMs < 0) return "0:00";

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getPreferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];

  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    ""
  );
}

function isVoiceMessage(message: MessagingConversationMessage) {
  return (
    message.type === "VOICE" ||
    Boolean(message.audioUrl || message.audioDurationMs || message.audioMimeType)
  );
}

function UserActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Conversation actions"
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted"
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-36 rounded-lg bg-popover p-1 shadow-xl"
        align="end"
      >
        <div className="flex flex-col gap-1">
          <Button
            className="w-full justify-start gap-2 rounded bg-transparent text-rose-600 hover:bg-accent hover:text-rose-600"
            size="sm"
            type="button"
            variant="ghost"
          >
            <UserMinus2 aria-hidden="true" className="size-4" />
            <span className="font-medium text-xs">Block User</span>
          </Button>
          <Button
            className="w-full justify-start gap-2 rounded bg-transparent text-destructive hover:bg-accent hover:text-destructive"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            <span className="font-medium text-xs">Delete Conversation</span>
          </Button>
          <Button
            className="w-full justify-start gap-2 rounded bg-transparent text-yellow-600 hover:bg-accent hover:text-yellow-600"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Flag aria-hidden="true" className="size-4" />
            <span className="font-medium text-xs">Report User</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageActions({ isMe }: { isMe: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Message actions"
          className="size-5 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isMe ? "end" : "start"}
        className="w-32 rounded-lg bg-popover p-1 shadow-xl"
      >
        <div className="flex flex-col gap-1">
          <Button
            aria-label="Reply"
            className="w-full justify-start gap-2 rounded px-2 py-1 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Reply aria-hidden="true" className="size-3" />
            <span>Reply</span>
          </Button>
          <Button
            aria-label="Copy"
            className="w-full justify-start gap-2 rounded px-2 py-1 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-3" />
            <span>Copy</span>
          </Button>
          {isMe ? (
            <Button
              aria-label="Delete"
              className="w-full justify-start gap-2 rounded px-2 py-1 text-destructive text-xs hover:text-destructive"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-3" />
              <span>Delete</span>
            </Button>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MessagingConversation({
  className,
  messages,
  participants,
  alignRightUserId,
  headerTitle,
  headerSubtitle,
  headerAvatarUrl,
  hideHeaderAvatar = false,
  readOnly = false,
  showSenderNames = false,
  emptyState = "No messages yet.",
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadMore,
  sendError,
  inputPlaceholder = "Type a message...",
  maxMessageLength = 5000,
  onSendMessage,
  onSendVoiceMessage,
  maxVoiceDurationMs = 5 * 60 * 1000,
  onBack,
}: MessagingConversationProps) {
  const [draft, setDraft] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const cancelRecordingRef = useRef(false);
  const resolvedParticipants = participants ?? [];
  const resolvedMessages = messages ?? [];
  const lastMessageId = resolvedMessages.at(-1)?.id;
  const rightAlignedUserId = alignRightUserId ?? "";
  const participantById = new Map(
    resolvedParticipants.map((participant) => [participant.id, participant]),
  );
  const headerParticipant = resolvedParticipants.find(
    (participant) => participant.id !== rightAlignedUserId,
  ) ?? resolvedParticipants[0];
  const title = headerTitle ?? headerParticipant?.name ?? "Conversation";
  const subtitle =
    headerSubtitle ?? statusLabel(headerParticipant?.status) ?? "Messages";
  const avatarUrl = headerAvatarUrl ?? headerParticipant?.avatar;
  const trimmedDraft = draft.trim();
  const canSend = Boolean(onSendMessage) && Boolean(trimmedDraft);
  const canRecordVoice =
    Boolean(onSendVoiceMessage) &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined";

  const handleSendMessage = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || !onSendMessage) return;

    setDraft("");
    try {
      await onSendMessage(trimmedDraft);
    } catch {
      setDraft(trimmedDraft);
    }
  };

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (!onSendVoiceMessage || isSendingVoice) return;

    setVoiceError(null);

    if (!canRecordVoice) {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      recordingChunksRef.current = [];
      cancelRecordingRef.current = false;
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = recordingChunksRef.current;
        const durationMs = Math.max(
          1,
          Date.now() - recordingStartedAtRef.current,
        );
        const contentType = recorder.mimeType || mimeType || "audio/webm";

        setIsRecording(false);
        setRecordingElapsedMs(0);
        mediaRecorderRef.current = null;
        stopMediaTracks();

        if (cancelRecordingRef.current || chunks.length === 0) {
          return;
        }

        const blob = new Blob(chunks, { type: contentType });

        try {
          setIsSendingVoice(true);
          await onSendVoiceMessage({ blob, audioDurationMs: durationMs, contentType });
        } catch (error) {
          setVoiceError(
            error instanceof Error ? error.message : "Unable to send voice message.",
          );
        } finally {
          setIsSendingVoice(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingElapsedMs(0);
    } catch (error) {
      stopMediaTracks();
      setIsRecording(false);
      setVoiceError(
        error instanceof Error ? error.message : "Unable to start recording.",
      );
    }
  }, [canRecordVoice, isSendingVoice, onSendVoiceMessage, stopMediaTracks]);

  const stopVoiceRecording = useCallback((cancel = false) => {
    const recorder = mediaRecorderRef.current;

    cancelRecordingRef.current = cancel;

    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      setRecordingElapsedMs(0);
      stopMediaTracks();
      return;
    }

    recorder.stop();
  }, [stopMediaTracks]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  useEffect(() => {
    if (!isRecording) return;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - recordingStartedAtRef.current;
      setRecordingElapsedMs(elapsed);

      if (elapsed >= maxVoiceDurationMs) {
        stopVoiceRecording(false);
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [isRecording, maxVoiceDurationMs, stopVoiceRecording]);

  useEffect(() => {
    return () => {
      stopVoiceRecording(true);
    };
  }, [stopVoiceRecording]);

  return (
    <section
      className={cn(
        "bg-card rounded-3xl flex flex-col h-160 border shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="p-4 border-b border-border/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-between z-10 relative shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 -ml-2" onClick={onBack}>
              <ArrowLeft className="size-5" />
            </Button>
          )}
          {!hideHeaderAvatar && (
            <div className="relative shrink-0">
              <Avatar className="w-10 h-10 border-2 border-background shadow-xs">
                <AvatarImage
                  alt={title}
                  src={avatarUrl || undefined}
                  className="object-cover"
                />
                <AvatarFallback>{initials(title)}</AvatarFallback>
              </Avatar>
              {headerParticipant?.status ? (
                <span
                  className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 border-2 border-card rounded-full",
                    headerParticipant.status === "online"
                      ? "bg-emerald-500"
                      : headerParticipant.status === "dnd"
                        ? "bg-amber-500"
                        : "bg-muted-foreground",
                  )}
                />
              ) : null}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-card-foreground">
              {title}
            </div>
            {subtitle ? (
              <div className="truncate text-[10px] text-muted-foreground font-bold uppercase">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {readOnly ? null : <UserActionsMenu />}
      </div>

      <ScrollArea className="flex-1 min-h-0 p-5">
        <div className="flex flex-col gap-3">
          {hasMoreMessages && onLoadMore ? (
            <div className="flex justify-center">
              <Button
                className="h-8 rounded-lg px-3 text-xs"
                disabled={isLoadingMore}
                onClick={onLoadMore}
                size="sm"
                type="button"
                variant="outline"
              >
                {isLoadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Load older messages
              </Button>
            </div>
          ) : null}

          {resolvedMessages.length === 0 ? (
            <div className="flex h-full min-h-64 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              {emptyState}
            </div>
          ) : (
            resolvedMessages.map((msg) => {
              const sender = participantById.get(msg.senderUserId);
              const isMe = msg.senderUserId === rightAlignedUserId;
              const timestamp = formatMessageTime(msg);
              const voiceMessage = isVoiceMessage(msg);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1.5 group w-full",
                    isMe ? "items-end" : "items-start",
                  )}
                >
                  {showSenderNames ? (
                    <div
                      className={cn(
                        "max-w-[85%] truncate px-1 text-[10px] font-bold uppercase text-muted-foreground",
                        isMe ? "text-right" : "text-left",
                      )}
                    >
                      {sender?.roleLabel
                        ? `${sender.name} - ${sender.roleLabel}`
                        : sender?.name ?? "Unknown user"}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "py-2 px-3.5 rounded-lg text-sm w-fit max-w-[85%] whitespace-pre-wrap break-words shadow-sm transition-all",
                      voiceMessage ? "min-w-48" : null,
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm font-medium"
                        : "bg-white border border-border/40 text-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:border-border/60 rounded-tl-sm",
                    )}
                  >
                    {voiceMessage ? (
                      msg.audioUrl ? (
                        <div className="flex flex-col gap-1.5">
                          <audio
                            className="h-9 w-56 max-w-full"
                            controls
                            preload="metadata"
                            src={msg.audioUrl}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {msg.deliveryStatus === "sending" ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : null}
                          <span>Voice message</span>
                          <span className="text-[10px] opacity-80">
                            {formatVoiceDuration(msg.audioDurationMs)}
                          </span>
                        </div>
                      )
                    ) : (
                      msg.text
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-1 text-[10px] font-medium text-muted-foreground",
                      isMe ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {timestamp ? <span>{timestamp}</span> : null}
                    {isMe ? (
                      <MessageDeliveryTicks status={msg.deliveryStatus} />
                    ) : null}
                    {readOnly ? null : (
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageActions isMe={isMe} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {readOnly ? (
        <div className="p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-t border-border/40 pb-6 relative z-10 flex justify-center">
          <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>This order is no longer active. The chat is read-only.</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-t border-border/40 pb-6 relative z-10">
          {isRecording ? (
            <div className="flex items-center gap-2 rounded-xl border bg-background p-2 shadow-sm">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2 text-sm font-medium text-foreground">
                <span className="size-2 rounded-full bg-destructive" />
                <span>{formatVoiceDuration(recordingElapsedMs)}</span>
              </div>
              <button
                aria-label="Cancel recording"
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => stopVoiceRecording(true)}
                type="button"
              >
                <X className="size-4" />
              </button>
              <button
                aria-label="Send voice message"
                className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={() => stopVoiceRecording(false)}
                type="button"
              >
                <Square className="size-4 fill-current" />
              </button>
            </div>
          ) : (
            <form className="relative flex items-center" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder={inputPlaceholder}
                className="w-full bg-white dark:bg-slate-950 border border-border/60 rounded-lg py-3.5 pl-4 pr-24 text-sm text-foreground focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-muted-foreground shadow-sm hover:border-border/80"
                disabled={!onSendMessage || isSendingVoice}
                maxLength={maxMessageLength}
                onChange={(event) => setDraft(event.target.value)}
                value={draft}
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                {onSendVoiceMessage ? (
                  <button
                    aria-label="Record voice message"
                    className="flex size-9 items-center justify-center rounded-lg text-primary transition-all hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canRecordVoice || isSendingVoice}
                    onClick={startVoiceRecording}
                    type="button"
                  >
                    {isSendingVoice ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </button>
                ) : null}
                <button
                  aria-label="Send message"
                  className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  disabled={!canSend || isSendingVoice}
                  type="submit"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
          {sendError ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              {sendError}
            </p>
          ) : null}
          {voiceError ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              {voiceError}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
