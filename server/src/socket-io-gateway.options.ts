import type { GatewayMetadata } from '@nestjs/websockets';


export const SOCKET_IO_GATEWAY_OPTIONS = {
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
  pingInterval: 30_000,
  pingTimeout: 60_000,
} satisfies GatewayMetadata;
