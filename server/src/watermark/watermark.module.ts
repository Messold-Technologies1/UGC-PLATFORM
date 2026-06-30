import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WatermarkService } from './watermark.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [WatermarkService],
  exports: [WatermarkService],
})
export class WatermarkModule {}
