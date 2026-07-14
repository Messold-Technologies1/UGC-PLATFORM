import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import type { CreatorsPublicListResponseDto } from './dto/creators-public-list-response.dto';

const CACHE_KEY_PREFIX = 'creators:list:v1:';
const CACHE_TTL_SECONDS = 60;

/**
 * Short-TTL cache for the public creator browse/search endpoint. Env-gated on
 * REDIS_URL (same pattern as WatermarkQueueService / RedisIoAdapter) — absent
 * REDIS_URL, every call is a silent no-op and listCreators falls through to
 * Postgres exactly as before.
 *
 * 60s staleness is an intentional tradeoff: a creator that just got
 * (un)listed may take up to a minute to appear/disappear from browse
 * results. No active invalidation on write — not worth the complexity for a
 * browse listing that doesn't need to be real-time-fresh.
 */
@Injectable()
export class CreatorListCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CreatorListCacheService.name);
  private readonly client: Redis | null;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — creator list cache disabled');
      this.client = null;
      return;
    }
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.client.on('error', (err) =>
      this.logger.warn(`creator list cache redis error: ${err.message}`),
    );
  }

  onModuleDestroy(): void {
    void this.client?.quit();
  }

  buildKey(query: ListCreatorsQueryDto): string {
    const normalized = Object.keys(query)
      .sort()
      .map(
        (key) =>
          `${key}=${JSON.stringify((query as Record<string, unknown>)[key])}`,
      )
      .join('&');
    const hash = createHash('sha256').update(normalized).digest('hex');
    return `${CACHE_KEY_PREFIX}${hash}`;
  }

  async get(key: string): Promise<CreatorsPublicListResponseDto | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as CreatorsPublicListResponseDto;
    } catch (err) {
      this.logger.warn(
        `creator list cache get failed: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: CreatorsPublicListResponseDto): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(
        key,
        JSON.stringify(value),
        'EX',
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `creator list cache set failed: ${(err as Error).message}`,
      );
    }
  }
}
