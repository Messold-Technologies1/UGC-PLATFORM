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
import { BrandAccessService } from '../brand-access/brand-access.service';
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

function mapScript(value: unknown): Record<string, unknown> | unknown[] | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    return value as Record<string, unknown> | unknown[];
  }
  return null;
}

function normalizeScriptInput(
  value: Record<string, unknown> | unknown[] | undefined,
): Record<string, unknown> | unknown[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object') {
    throw new BadRequestException('script must be a JSON object or array');
  }
  return value;
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
  isProduct: boolean;
  willShipPhysicalProductToCreator: boolean;
  shootLocationKind: BriefShootLocationKind | null;
  shootLocationAddress: string | null;
  durationBucket: BriefDurationBucket | null;
  contentType: BriefContentType[];
  toneStyle: BriefToneStyle[];
  keyNoteToInclude: string | null;
  ctaNote: string | null;
  referenceLinks: unknown;
  script: unknown;
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
    isProduct: b.isProduct,
    willShipPhysicalProductToCreator: b.willShipPhysicalProductToCreator,
    shootLocationKind: b.shootLocationKind ?? null,
    shootLocationAddress: b.shootLocationAddress ?? null,
    durationBucket: b.durationBucket ?? null,
    contentType: b.contentType,
    toneStyle: b.toneStyle,
    keyNoteToInclude: b.keyNoteToInclude ?? null,
    ctaNote: b.ctaNote ?? null,
    referenceLinks: mapReferenceLinks(b.referenceLinks),
    script: mapScript(b.script),
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
    private readonly brandAccess: BrandAccessService,
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
    params: {
      actorUserId: string;
      brandProfileId?: string | null;
      dto: PresignBriefProductImageUploadDto;
    },
  ): Promise<PresignBriefProductImageUploadResponseDto> {
    await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const key = this.storage.buildObjectKey({
      kind: 'brief_product_image',
      userId: params.actorUserId,
      contentType: params.dto.contentType,
    });

    return this.storage.createPresignedPutUpload({
      key,
      contentType: params.dto.contentType,
      contentLength: params.dto.contentLength,
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
    actorUserId: string;
    brandProfileId?: string | null;
    dto: CreateBriefDto;
  }): Promise<{ id: string }> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const isProduct = params.dto.isProduct ?? true;
    const shipsPhysical =
      isProduct && (params.dto.willShipPhysicalProductToCreator ?? false);
    const productImageKey = params.dto.productImageKey?.trim() ?? '';

    if (!isProduct && params.dto.willShipPhysicalProductToCreator) {
      throw new BadRequestException(
        'willShipPhysicalProductToCreator is only allowed for product briefs',
      );
    }

    if (isProduct) {
      if (!productImageKey) {
        throw new BadRequestException(
          'productImageKey is required for product briefs',
        );
      }
      this.assertTempBriefProductImageKeyOwner(
        params.actorUserId,
        productImageKey,
      );
    } else if (productImageKey) {
      throw new BadRequestException(
        'productImageKey is only allowed for product briefs',
      );
    }

    const script = normalizeScriptInput(params.dto.script);

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
        isProduct,
        willShipPhysicalProductToCreator: shipsPhysical,
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
        ...(script !== undefined ? { script: script as any } : {}),
        finalNotes: params.dto.finalNotes,
      },
      select: { id: true },
    });

    if (productImageKey) {
      const finalProductImageKey =
        await this.storage.finalizeBriefProductImageKey({
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
    }

    return { id: created.id };
  }

  async listBriefsForBrand(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<BriefDto[]> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const rows = await this.prisma.brief.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((b) => mapBriefRow(b));
  }

  async getBriefForBrand(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    briefId: string;
  }): Promise<BriefDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const brief = await this.prisma.brief.findUnique({ where: { id: params.briefId } });
    if (!brief) throw new NotFoundException('Brief not found');
    if (brief.brandId !== brand.id) throw new ForbiddenException('Not your brief');

    return mapBriefRow(brief);
  }
}
