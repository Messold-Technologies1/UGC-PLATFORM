import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CreatorProfileModule } from '../creator-profile/creator-profile.module';
import { WishlistsController } from './wishlists.controller';
import { WishlistsService } from './wishlists.service';

@Module({
  imports: [forwardRef(() => AuthGuardsModule), CreatorProfileModule],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}
