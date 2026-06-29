import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter backed by Redis pub/sub.
 *
 * Without this, each Node process keeps its own in-memory set of connected
 * sockets, so an emit from one process (e.g. a separate watermark worker)
 * never reaches a client connected to another process (the API). The Redis
 * adapter relays emits across every process sharing the same Redis, which is
 * what makes cross-process realtime (worker → browser) work.
 *
 * Only used when REDIS_URL is configured; otherwise the default in-memory
 * adapter is fine for a single-process deployment.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(redisUrl: string): Promise<void> {
    const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const subClient = pubClient.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.IO Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
