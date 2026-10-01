import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { VerifyPhoneOtpResponseDto } from './dto/verify-phone-otp-response.dto';
import { SendPhoneOtpResponseDto } from './dto/send-phone-otp-response.dto';
import { PhoneVerificationService } from './phone-verification.service';
import { clientIpFrom, toSendHttpException } from './phone-otp-request.util';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthPhoneController {
  constructor(
    private readonly phoneVerification: PhoneVerificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('phone/send-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Send an OTP to a phone (WhatsApp, escalating to SMS on resend). Authenticated user.',
  })
  @ApiOkResponse({ type: SendPhoneOtpResponseDto })
  async sendOtp(
    @Body() dto: SendPhoneOtpDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<SendPhoneOtpResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: {
        phone: dto.phone,
        NOT: { id: req.user.id },
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Invalid request.');
    }
    try {
      const channel = await this.phoneVerification.sendVerificationCode(
        dto.phone,
        'profile',
        clientIpFrom(req),
      );
      return { channel };
    } catch (err) {
      throw toSendHttpException(err);
    }
  }

  @Post('phone/verify-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify SMS OTP and save phone on the authenticated user',
  })
  @ApiOkResponse({ type: VerifyPhoneOtpResponseDto })
  async verifyOtp(
    @Body() dto: VerifyPhoneOtpDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<VerifyPhoneOtpResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: {
        phone: dto.phone,
        NOT: { id: req.user.id },
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Invalid request.');
    }

    const status = await this.phoneVerification.verifyCode(
      dto.phone,
      dto.code,
      'profile',
    );
    const now = new Date();

    if (status === 'approved') {
      await this.prisma.user.update({
        where: { id: req.user.id },
        data: {
          phone: dto.phone,
          phoneVerified: true,
          phoneOtpFailedAttempts: 0,
          phoneOtpLastAttemptAt: now,
          phoneOtpLastStatus: status,
          phoneOtpLastPhone: dto.phone,
        },
      });
      return { status, phoneVerified: true };
    }

    await this.prisma.user.update({
      where: { id: req.user.id },
      data: {
        phoneOtpFailedAttempts: { increment: 1 },
        phoneOtpLastAttemptAt: now,
        phoneOtpLastStatus: status,
        phoneOtpLastPhone: dto.phone,
      },
    });

    if (status === 'max_attempts_reached') {
      throw new HttpException(
        {
          status,
          phoneVerified: false,
          message: 'Too many attempts. Please resend OTP.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (status === 'expired') {
      throw new BadRequestException({
        status,
        phoneVerified: false,
        message: 'Expired. Please resend OTP.',
      });
    }
    throw new BadRequestException({
      status,
      phoneVerified: false,
      message: 'Incorrect code.',
    });
  }
}
