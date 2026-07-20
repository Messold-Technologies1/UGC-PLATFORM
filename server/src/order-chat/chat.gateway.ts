import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RoleName } from '@prisma/client';
import { AUTH_COOKIE_NAMES } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SOCKET_IO_GATEWAY_OPTIONS } from '../socket-io-gateway.options';

/** Room every admin viewer joins to receive live chat for a specific order. */
export function orderRoom(orderId: string): string {
  return `order:${orderId}`;
}

@WebSocketGateway(SOCKET_IO_GATEWAY_OPTIONS)
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
      client.data.userId = userId;
      await client.join(`user:${userId}`);
    } catch (err) {
      this.logger.debug(
        `WS auth failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      client.disconnect(true);
    }
  }

  /**
   * Admin joins an order's live chat room so it receives brand/creator/support
   * messages in realtime (used by the admin dispute group chat). Only admins
   * are allowed in; participants already receive messages via their user room.
   */
  @SubscribeMessage('order-chat:subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: string },
  ): Promise<{ ok: boolean }> {
    const orderId = body?.orderId;
    const userId = client.data.userId as string | undefined;
    if (!orderId || !userId) return { ok: false };
    if (!(await this.isAdmin(userId))) return { ok: false };
    await client.join(orderRoom(orderId));
    return { ok: true };
  }

  @SubscribeMessage('order-chat:unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: string },
  ): Promise<{ ok: boolean }> {
    const orderId = body?.orderId;
    if (!orderId) return { ok: false };
    await client.leave(orderRoom(orderId));
    return { ok: true };
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) return false;
    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    return user.userRoles.some((ur) => ur.role.name === RoleName.ADMIN);
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

