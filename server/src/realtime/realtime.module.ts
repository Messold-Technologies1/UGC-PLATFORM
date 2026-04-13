import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderRealtimeNotifier } from './order-realtime.notifier';
import { PaymentsGateway } from './payments.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_ACCESS_EXPIRY',
            '15m',
          ) as import('jsonwebtoken').SignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [PaymentsGateway, OrderRealtimeNotifier],
  exports: [OrderRealtimeNotifier],
})
export class RealtimeModule {}
