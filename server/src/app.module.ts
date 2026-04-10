import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { CreatorProfileModule } from './creator-profile/creator-profile.module';
import { StorageModule } from './storage/storage.module';
import { CreatorPortfolioModule } from './creator-portfolio/creator-portfolio.module';
import { BrandProfileModule } from './brand-profile/brand-profile.module';
import { OrdersModule } from './orders/orders.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    CreatorProfileModule,
    CreatorPortfolioModule,
    BrandProfileModule,
    OrdersModule,
    WebhooksModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
