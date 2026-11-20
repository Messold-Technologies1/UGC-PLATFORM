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

/**
 * Shown when the number typed in is already on another account.
 *
 * This used to be an opaque 'Invalid request.' so the response leaked nothing,
 * but both endpoints are behind the JWT guard: the caller is a signed-in user
 * finishing their own profile (the Google route lands straight on this field
 * with no number of their own), so a dead-end toast cost them the one thing
 * they needed to know — that the number belongs to an account they already
 * have, and that another number is what gets them through.
 */
const PHONE_TAKEN_MESSAGE =
  'You already have an account with this number. Please try with a different number.';

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
      throw new BadRequestException(PHONE_TAKEN_MESSAGE);
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
      throw new BadRequestException(PHONE_TAKEN_MESSAGE);
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
