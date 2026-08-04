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
import { ChatsModule } from './chats/chats.module';
import { BriefsModule } from './briefs/briefs.module';
import { WishlistsModule } from './wishlists/wishlists.module';
import { BrandAccessModule } from './brand-access/brand-access.module';
import { AgencyModule } from './agency/agency.module';
import { MailModule } from './mail/mail.module';
import { CitiesModule } from './cities/cities.module';
import { LegalPagesModule } from './legal-pages/legal-pages.module';
import { MetaCapiModule } from './meta-capi/meta-capi.module';
import { ContactUsModule } from './contact-us/contact-us.module';
import { SocialConnectionsModule } from './social-connections/social-connections.module';

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
    MailModule,
    MetaCapiModule,
    BrandAccessModule,
    StorageModule,
    HealthModule,
    AuthModule,
    CitiesModule,
    CreatorProfileModule,
    CreatorPortfolioModule,
    BrandProfileModule,
    AgencyModule,
    OrdersModule,
    BriefsModule,
    WishlistsModule,
    OrderChatModule,
    ChatsModule,
    WebhooksModule,
    JobsModule,
    RealtimeModule,
    LegalPagesModule,
    ContactUsModule,
    SocialConnectionsModule,
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
