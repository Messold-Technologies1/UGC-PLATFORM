import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class PaymentsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(PaymentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const raw =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;
    const header = client.handshake.headers.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7).trim()
        : undefined;
    const token = raw ?? bearer;
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
}
