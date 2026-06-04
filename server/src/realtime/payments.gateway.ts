import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AUTH_COOKIE_NAMES } from '../auth/auth.service';
import { SOCKET_IO_GATEWAY_OPTIONS } from '../socket-io-gateway.options';

@WebSocketGateway(SOCKET_IO_GATEWAY_OPTIONS)
export class PaymentsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(PaymentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const cookieHeader = client.handshake.headers.cookie;
    const cookieToken =
      typeof cookieHeader === 'string'
        ? this.parseCookieHeader(cookieHeader)[AUTH_COOKIE_NAMES.accessToken]
        : undefined;

    const raw =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;

    const header = client.handshake.headers.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7).trim()
        : undefined;

    const token = cookieToken ?? raw ?? bearer;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const userId = payload.sub;
      if (!userId) throw new Error('Missing sub');
      await client.join(`user:${userId}`);
    } catch (err) {
      this.logger.debug(`WS auth failed: ${err instanceof Error ? err.message : err}`);
      client.disconnect(true);
    }
  }

  private parseCookieHeader(header: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of header.split(';')) {
      const [rawKey, ...rawValParts] = part.trim().split('=');
      if (!rawKey) continue;
      const rawVal = rawValParts.join('=');
      if (!rawVal) continue;
      try {
        out[rawKey] = decodeURIComponent(rawVal);
      } catch {
        out[rawKey] = rawVal;
      }
    }
    return out;
  }
}
