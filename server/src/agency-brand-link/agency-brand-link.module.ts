import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminAgencyBrandLinksController } from './admin-agency-brand-links.controller';
import { AgencyBrandLinkService } from './agency-brand-link.service';
import { AgencyBrandLinksController } from './agency-brand-links.controller';
import { BrandAgencyLinksController } from './brand-agency-links.controller';

/**
 * The agency↔brand partner link.
 *
 * Depends only on auth and notifications. Every feature that ACTS on a link
 * (orders, briefs, wishlists, chat) reads it through the global
 * BrandAccessService rather than importing this module, so the dependency
 * arrow keeps pointing one way.
 */
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [
    BrandAgencyLinksController,
    AgencyBrandLinksController,
    AdminAgencyBrandLinksController,
  ],
  providers: [AgencyBrandLinkService],
  exports: [AgencyBrandLinkService],
})
export class AgencyBrandLinkModule {}
