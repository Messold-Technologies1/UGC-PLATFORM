import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCreatorEventsController } from './admin-creator-events.controller';
import { CreatorEventsController } from './creator-events.controller';
import { CreatorEventsService } from './creator-events.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CreatorEventsController, AdminCreatorEventsController],
  providers: [CreatorEventsService],
  exports: [CreatorEventsService],
})
export class CreatorEventsModule {}
