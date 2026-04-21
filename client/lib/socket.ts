"use client";
import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import type { ServerToClientEvents } from "@/lib/realtime-events";

let socket: Socket<ServerToClientEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents> {
  if (socket) return socket;
  socket = io(env.socketUrl, {
    withCredentials: true,
    transports: ["websocket"],
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