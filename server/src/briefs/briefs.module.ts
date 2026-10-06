import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BriefsController } from './briefs.controller';
import { BriefsService } from './briefs.service';

@Module({
  imports: [AuthModule, AgencyModule, PrismaModule, OrdersModule],
  controllers: [BriefsController],
  providers: [BriefsService],
  exports: [BriefsService],
})
export class BriefsModule {}

