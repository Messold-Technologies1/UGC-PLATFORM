import { Module, forwardRef } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  // JwtAuthGuard pulls JwtService and AuthService from here.
  imports: [forwardRef(() => AuthGuardsModule)],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService],
})
export class NotificationPreferencesModule {}
