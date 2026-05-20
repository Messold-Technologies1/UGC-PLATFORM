import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PhoneVerificationService } from './phone-verification.service';
import { SignupSendPhoneOtpDto } from './dto/signup-send-phone-otp.dto';
import { SignupPresignUploadDto } from './dto/signup-presign-upload.dto';
import { StorageService } from '../storage/storage.service';
import { PresignUploadResponseDto } from '../brand-profile/dto/presign-brand-logo-upload.dto';

@ApiTags('auth')
@Controller('auth/signup')
export class AuthSignupController {
  constructor(
    private readonly phoneVerification: PhoneVerificationService,
    private readonly storage: StorageService,
  ) {}

  @Post('phone/send-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Send SMS OTP for signup (unauthenticated; use before role-based register)',
  })
  @ApiNoContentResponse({ description: 'OTP sent' })
  async sendSignupPhoneOtp(@Body() dto: SignupSendPhoneOtpDto): Promise<void> {
    await this.phoneVerification.sendVerificationCode(dto.phone);
  }

  @Post('presign/creator-portfolio-video')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Presign creator portfolio video upload before registration' })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignCreatorPortfolioVideo(
    @Body() dto: SignupPresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const key = this.storage.buildTempCreatorPortfolioVideoKeyForSignup(
      dto.email,
      dto.contentType,
    );
    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  @Post('presign/brand-logo')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Presign brand logo upload before registration' })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignBrandLogoSignup(
    @Body() dto: SignupPresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const key = this.storage.buildTempBrandLogoKeyForSignup(
      dto.email,
      dto.contentType,
    );
    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  @Post('presign/brand-pronunciation')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Presign brand pronunciation audio upload before registration' })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignBrandPronunciationSignup(
    @Body() dto: SignupPresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const key = this.storage.buildTempBrandPronunciationAudioKeyForSignup(
      dto.email,
      dto.contentType,
    );
    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  @Post('presign/agency-logo')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Presign agency logo upload before registration' })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  async presignAgencyLogoSignup(
    @Body() dto: SignupPresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const key = this.storage.buildTempAgencyLogoKeyForSignup(
      dto.email,
      dto.contentType,
    );
    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }
}
