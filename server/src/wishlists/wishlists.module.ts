import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BrandAccessModule } from '../brand-access/brand-access.module';
import { CreatorProfileModule } from '../creator-profile/creator-profile.module';
import { WishlistsController } from './wishlists.controller';
import { WishlistsService } from './wishlists.service';

@Module({
  imports: [AuthModule, PrismaModule, BrandAccessModule, CreatorProfileModule],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}
