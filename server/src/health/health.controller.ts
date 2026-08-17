import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma.health';

@SkipThrottle()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  /**
   * Liveness probe — process only, NO database query. Hosting platforms and
   * uptime monitors hit this very frequently; querying the DB here would keep
   * the Neon compute endpoint awake 24/7 and prevent autosuspend. Use
   * `GET /health/db` when you specifically need to verify the database.
   */
  @Get()
  @ApiOperation({ summary: 'Liveness check (no database query)' })
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness — verifies the database. Poll sparingly (it wakes Neon). */
  @Get('db')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check (verifies the database)' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
