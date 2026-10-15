import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAgencyBrandLinksController } from './admin-agency-brand-links.controller';
import { AgencyBrandLinkService } from './agency-brand-link.service';
import { AgencyBrandLinksController } from './agency-brand-links.controller';
import { BrandAgencyLinksController } from './brand-agency-links.controller';

/**
 * The agency↔brand partner link.
 *
 * Deliberately depends on nothing but auth: the link is a relationship, and
 * every feature that acts on it (orders, briefs, wishlists, chat) reads it
 * through the global BrandAccessService rather than importing this module.
 * That keeps the dependency arrow pointing one way.
 */
@Module({
  imports: [AuthModule],
  controllers: [
    BrandAgencyLinksController,
    AgencyBrandLinksController,
    AdminAgencyBrandLinksController,
  ],
  providers: [AgencyBrandLinkService],
  exports: [AgencyBrandLinkService],
})
export class AgencyBrandLinkModule {}
