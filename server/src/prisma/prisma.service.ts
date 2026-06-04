import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { runtimeDatabaseUrlFromConfig } from './database-url';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      datasources: {
        db: { url: runtimeDatabaseUrlFromConfig(config) },
      },
      transactionOptions: {
        maxWait: config.get<number>('DATABASE_TRANSACTION_MAX_WAIT_MS', 5_000),
        timeout: config.get<number>(
          'DATABASE_TRANSACTION_TIMEOUT_MS',
          30_000,
        ),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
