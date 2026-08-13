"use client";
import { io, type Socket } from "socket.io-client";
import api from "@/lib/api";
import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/realtime-events";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Provide the handshake credentials before each (re)connect. The socket
 * connects cross-origin to the API host, where in-app browsers / Safari ITP
 * won't send the httpOnly auth cookie — so we fetch a short-lived token
 * (via the same-origin BFF, where the cookie IS first-party) and pass it as
 * `auth.token`. Normal browsers also send the cookie; the gateway accepts
 * either. If the token fetch fails we fall back to cookie-only auth.
 */
async function withAuthToken(
  cb: (data: { token?: string }) => void,
): Promise<void> {
  try {
    const { data } = await api.get<{ token: string }>(ENDPOINTS.AUTH.WS_TOKEN);
    cb({ token: data.token });
  } catch {
    cb({});
  }
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket) return socket;
  socket = io(env.socketUrl, {
    withCredentials: true,
    transports: ["websocket"],
    auth: (cb) => void withAuthToken(cb),
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}