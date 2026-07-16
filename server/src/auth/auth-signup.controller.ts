import {
  Body,
  Controller,
  ForbiddenException,
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
import {
  SignupAbortMultipartUploadDto,
  SignupCompleteMultipartUploadDto,
  SignupCompleteMultipartUploadResponseDto,
  SignupCreateMultipartUploadDto,
  SignupCreateMultipartUploadResponseDto,
  SignupSignMultipartPartDto,
  SignupSignMultipartPartResponseDto,
} from './dto/signup-multipart-upload.dto';
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

  @Post('multipart/creator-portfolio-video/create')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Begin a multipart upload for a signup portfolio video',
  })
  @ApiCreatedResponse({ type: SignupCreateMultipartUploadResponseDto })
  async createCreatorPortfolioVideoMultipart(
    @Body() dto: SignupCreateMultipartUploadDto,
  ): Promise<SignupCreateMultipartUploadResponseDto> {
    const key = this.storage.buildTempCreatorPortfolioVideoKeyForSignup(
      dto.email,
      dto.contentType,
    );
    return this.storage.createMultipartUpload({
      key,
      contentType: dto.contentType,
    });
  }

  @Post('multipart/creator-portfolio-video/sign-part')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 200, ttl: 60_000 } })
  @ApiOperation({ summary: 'Presign one part of a signup portfolio video upload' })
  @ApiCreatedResponse({ type: SignupSignMultipartPartResponseDto })
  async signCreatorPortfolioVideoPart(
    @Body() dto: SignupSignMultipartPartDto,
  ): Promise<SignupSignMultipartPartResponseDto> {
    this.assertSignupVideoKeyOwner(dto.email, dto.key);
    const url = await this.storage.signUploadPart({
      key: dto.key,
      uploadId: dto.uploadId,
      partNumber: dto.partNumber,
    });
    return { url };
  }

  @Post('multipart/creator-portfolio-video/complete')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Finalize a signup portfolio video multipart upload' })
  @ApiCreatedResponse({ type: SignupCompleteMultipartUploadResponseDto })
  async completeCreatorPortfolioVideoMultipart(
    @Body() dto: SignupCompleteMultipartUploadDto,
  ): Promise<SignupCompleteMultipartUploadResponseDto> {
    this.assertSignupVideoKeyOwner(dto.email, dto.key);
    const key = await this.storage.completeMultipartUpload({
      key: dto.key,
      uploadId: dto.uploadId,
      parts: dto.parts,
    });
    return { key, cdnUrl: this.storage.buildCdnUrl(key) };
  }

  @Post('multipart/creator-portfolio-video/abort')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cancel a signup portfolio video multipart upload' })
  @ApiNoContentResponse({ description: 'Multipart upload aborted' })
  async abortCreatorPortfolioVideoMultipart(
    @Body() dto: SignupAbortMultipartUploadDto,
  ): Promise<void> {
    this.assertSignupVideoKeyOwner(dto.email, dto.key);
    await this.storage.abortMultipartUpload({
      key: dto.key,
      uploadId: dto.uploadId,
    });
  }

  /** The temp key embeds a hash of the email; reject keys that don't match. */
  private assertSignupVideoKeyOwner(email: string, key: string): void {
    if (!this.storage.isTempCreatorPortfolioVideoKeyForSignup(email, key)) {
      throw new ForbiddenException('Invalid upload key');
    }
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
