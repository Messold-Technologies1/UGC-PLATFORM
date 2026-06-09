import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthPhoneController } from './auth-phone.controller';
import { AuthSignupController } from './auth-signup.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SignupModule } from './signup.module';
import { StorageModule } from '../storage/storage.module';
import { AdminGuard } from './guards/admin.guard';
import { WorkspacePermissionGuard } from './guards/workspace-permission.guard';

@Module({
  imports: [
    PrismaModule,
    SignupModule,
    StorageModule,
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
  controllers: [AuthController, AuthPhoneController, AuthSignupController],
  providers: [AuthService, PasswordService, AdminGuard, WorkspacePermissionGuard],
  exports: [
    AuthService,
    PasswordService,
    JwtModule,
    AdminGuard,
    WorkspacePermissionGuard,
  ],
})
export class AuthModule {}
