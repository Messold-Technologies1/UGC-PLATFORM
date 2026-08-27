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

/**
 * Room for live updates about one creator's portfolio assets.
 *
 * The creator themselves does not need it — they already receive these on their
 * `user:` room. This exists for admins, who import reels on a creator's behalf
 * and watch the same rows settle from the admin profile page.
 */
export function portfolioRoom(creatorProfileId: string): string {
  return `portfolio:${creatorProfileId}`;
}

@WebSocketGateway(SOCKET_IO_GATEWAY_OPTIONS)
export class PaymentsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(PaymentsGateway.name);

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
        `WS auth failed: ${err instanceof Error ? err.message : err}`,
      );
      client.disconnect(true);
    }
  }

  /**
   * Admin joins a creator's portfolio room. Admin-only: a creator has no reason
   * to ask, and letting anyone in would leak another creator's asset activity.
   */
  @SubscribeMessage('portfolio:subscribe')
  async handlePortfolioSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { creatorProfileId?: string },
  ): Promise<{ ok: boolean }> {
    const creatorProfileId = body?.creatorProfileId;
    const userId = client.data.userId as string | undefined;
    if (!creatorProfileId || !userId) return { ok: false };
    if (!(await this.isAdmin(userId))) return { ok: false };
    await client.join(portfolioRoom(creatorProfileId));
    return { ok: true };
  }

  @SubscribeMessage('portfolio:unsubscribe')
  async handlePortfolioUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { creatorProfileId?: string },
  ): Promise<{ ok: boolean }> {
    const creatorProfileId = body?.creatorProfileId;
    if (!creatorProfileId) return { ok: false };
    await client.leave(portfolioRoom(creatorProfileId));
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
