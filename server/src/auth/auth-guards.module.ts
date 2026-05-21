import { Module, forwardRef } from '@nestjs/common';

/**
 * Lazy re-export of AuthModule so feature modules can use JwtAuthGuard without
 * creating a static import cycle (AuthModule -> SignupModule -> CreatorProfileModule -> AuthModule).
 */
@Module({
  imports: [forwardRef(() => require('./auth.module').AuthModule)],
  exports: [forwardRef(() => require('./auth.module').AuthModule)],
})
export class AuthGuardsModule {}
