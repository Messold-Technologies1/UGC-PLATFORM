import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BriefContentType,
  BriefDurationBucket,
  BriefShootLocationKind,
  BriefToneStyle,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { BriefFieldOptionsResponseDto } from './dto/brief-field-options-response.dto';
import type { CreateBriefDto } from './dto/create-brief.dto';
import type { BriefDto } from './dto/brief.dto';
import type { PresignBriefProductImageUploadDto } from './dto/presign-brief-product-image-upload.dto';
import type { PresignBriefProductImageUploadResponseDto } from './dto/presign-brief-product-image-upload.dto';

function mapReferenceLinks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function mapBriefRow(b: {
  id: string;
  brandName: string | null;
  brandPronunciationAudioKey: string | null;
  brandPronunciationAudioUrl: string | null;
  industry: string | null;
  brandLogoKey: string | null;
  brandLogoUrl: string | null;
  productName: string | null;
  productDescription: string | null;
  productPageUrl: string | null;
  productImageKey: string | null;
  productImageUrl: string | null;
  willShipPhysicalProductToCreator: boolean;
  shootLocationKind: BriefShootLocationKind | null;
  shootLocationAddress: string | null;
  durationBucket: BriefDurationBucket | null;
  contentType: BriefContentType[];
  toneStyle: BriefToneStyle[];
  keyNoteToInclude: string | null;
  ctaNote: string | null;
  referenceLinks: unknown;
  finalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BriefDto {
  return {
    id: b.id,
    brandName: b.brandName ?? null,
    brandPronunciationAudioKey: b.brandPronunciationAudioKey ?? null,
    brandPronunciationAudioUrl: b.brandPronunciationAudioUrl ?? null,
    industry: b.industry ?? null,
    brandLogoKey: b.brandLogoKey ?? null,
    brandLogoUrl: b.brandLogoUrl ?? null,
    productName: b.productName ?? null,
    productDescription: b.productDescription ?? null,
    productPageUrl: b.productPageUrl ?? null,
    productImageKey: b.productImageKey ?? null,
    productImageUrl: b.productImageUrl ?? null,
    willShipPhysicalProductToCreator: b.willShipPhysicalProductToCreator,
    shootLocationKind: b.shootLocationKind ?? null,
    shootLocationAddress: b.shootLocationAddress ?? null,
    durationBucket: b.durationBucket ?? null,
    contentType: b.contentType,
    toneStyle: b.toneStyle,
    keyNoteToInclude: b.keyNoteToInclude ?? null,
    ctaNote: b.ctaNote ?? null,
    referenceLinks: mapReferenceLinks(b.referenceLinks),
    finalNotes: b.finalNotes ?? null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

@Injectable()
export class BriefsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private assertTempBriefProductImageKeyOwner(
    brandUserId: string,
    key: string,
  ): void {
    if (!this.storage.isTempBriefProductImageKeyForUser(brandUserId, key)) {
      throw new BadRequestException('Invalid productImageKey');
    }
  }

  async presignProductImageUpload(
    brandUserId: string,
    dto: PresignBriefProductImageUploadDto,
  ): Promise<PresignBriefProductImageUploadResponseDto> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const key = this.storage.buildObjectKey({
      kind: 'brief_product_image',
      userId: brandUserId,
      contentType: dto.contentType,
    });

    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  getBriefFieldOptions(): BriefFieldOptionsResponseDto {
    return {
      shootLocationKinds: Object.values(
        BriefShootLocationKind,
      ) as BriefShootLocationKind[],
      durationBuckets: Object.values(BriefDurationBucket) as BriefDurationBucket[],
      contentTypes: Object.values(BriefContentType) as BriefContentType[],
      toneStyles: Object.values(BriefToneStyle) as BriefToneStyle[],
    };
  }

  async createBrief(params: {
    brandUserId: string;
    dto: CreateBriefDto;
  }): Promise<{ id: string }> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const productImageKey = params.dto.productImageKey.trim();
    if (!productImageKey) {
      throw new BadRequestException('productImageKey is required');
    }
    this.assertTempBriefProductImageKeyOwner(params.brandUserId, productImageKey);

    const created = await this.prisma.brief.create({
      data: {
        brandId: brand.id,
        brandName: params.dto.brandName,
        brandPronunciationAudioKey: params.dto.brandPronunciationAudioKey,
        brandPronunciationAudioUrl: params.dto.brandPronunciationAudioUrl,
        industry: params.dto.industry,
        brandLogoKey: params.dto.brandLogoKey,
        brandLogoUrl: params.dto.brandLogoUrl,
        productName: params.dto.productName,
        productDescription: params.dto.productDescription,
        productPageUrl: params.dto.productPageUrl,
        willShipPhysicalProductToCreator:
          params.dto.willShipPhysicalProductToCreator ?? false,
        shootLocationKind: params.dto.shootLocationKind,
        shootLocationAddress: params.dto.shootLocationAddress,
        durationBucket: params.dto.durationBucket,
        ...(params.dto.contentType !== undefined
          ? { contentType: params.dto.contentType }
          : {}),
        ...(params.dto.toneStyle !== undefined ? { toneStyle: params.dto.toneStyle } : {}),
        keyNoteToInclude: params.dto.keyNoteToInclude,
        ctaNote: params.dto.ctaNote,
        referenceLinks: (params.dto.referenceLinks ?? []) as any,
        finalNotes: params.dto.finalNotes,
      },
      select: { id: true },
    });

    const finalProductImageKey = await this.storage.finalizeBriefProductImageKey({
      tempKey: productImageKey,
      briefId: created.id,
      deleteTemp: true,
    });

    await this.prisma.brief.update({
      where: { id: created.id },
      data: {
        productImageKey: finalProductImageKey,
        productImageUrl: this.storage.buildCdnUrl(finalProductImageKey),
      },
    });

    return { id: created.id };
  }

  async listBriefsForBrand(params: { brandUserId: string }): Promise<BriefDto[]> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const rows = await this.prisma.brief.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((b) => mapBriefRow(b));
  }

  async getBriefForBrand(params: {
    brandUserId: string;
    briefId: string;
  }): Promise<BriefDto> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const brief = await this.prisma.brief.findUnique({ where: { id: params.briefId } });
    if (!brief) throw new NotFoundException('Brief not found');
    if (brief.brandId !== brand.id) throw new ForbiddenException('Not your brief');

    return mapBriefRow(brief);
  }
}
