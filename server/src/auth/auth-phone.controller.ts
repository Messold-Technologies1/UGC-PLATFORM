import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
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
import { PhoneOtpStatusQueryDto } from './dto/phone-otp-status-query.dto';
import { PhoneOtpStatusResponseDto } from './dto/phone-otp-status-response.dto';
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Send a WhatsApp OTP to a phone. Authenticated user.',
  })
  @ApiNoContentResponse({ description: 'OTP sent' })
  async sendOtp(
    @Body() dto: SendPhoneOtpDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
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
      await this.phoneVerification.sendVerificationCode(
        dto.phone,
        'profile',
        clientIpFrom(req),
      );
    } catch (err) {
      throw toSendHttpException(err);
    }
  }

  @Get('phone/otp-status')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Delivery state of the last OTP sent to a phone (is the number on WhatsApp?)',
  })
  @ApiOkResponse({ type: PhoneOtpStatusResponseDto })
  async otpStatus(
    @Query() query: PhoneOtpStatusQueryDto,
  ): Promise<PhoneOtpStatusResponseDto> {
    return this.phoneVerification.getDeliveryState(query.phone, 'profile');
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
