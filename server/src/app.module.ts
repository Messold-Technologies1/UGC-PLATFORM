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
import { RealtimeModule } from './realtime/realtime.module';
import { OrderChatModule } from './order-chat/order-chat.module';
import { BriefsModule } from './briefs/briefs.module';
import { BrandAccessModule } from './brand-access/brand-access.module';
import { AgencyModule } from './agency/agency.module';

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
    BrandAccessModule,
    StorageModule,
    HealthModule,
    AuthModule,
    CreatorProfileModule,
    CreatorPortfolioModule,
    BrandProfileModule,
    AgencyModule,
    OrdersModule,
    BriefsModule,
    OrderChatModule,
    WebhooksModule,
    JobsModule,
    RealtimeModule,
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
