import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WatermarkService } from './watermark.service';

@Module({
  imports: [PrismaModule],
  providers: [WatermarkService],
  exports: [WatermarkService],
})
export class WatermarkModule {}
