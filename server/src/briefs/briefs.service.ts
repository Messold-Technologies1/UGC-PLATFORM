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
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { BriefFieldOptionsResponseDto } from './dto/brief-field-options-response.dto';
import type { CreateBriefDto } from './dto/create-brief.dto';
import type { UpdateBriefDto } from './dto/update-brief.dto';
import type { BriefDto } from './dto/brief.dto';
import type {
  AttachBriefToOrderResultDto,
  AttachBriefToOrdersResponseDto,
} from './dto/attach-brief-to-orders-response.dto';
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
    private readonly ordersService: OrdersService,
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

    const profileBrandName = brand.brandName?.trim() ?? '';
    const providedBrandName = params.dto.brandName?.trim() ?? '';
    let briefBrandName: string;
    if (profileBrandName) {
      briefBrandName = profileBrandName;
    } else if (providedBrandName) {
      briefBrandName = providedBrandName;
    } else {
      throw new BadRequestException(
        'Brand name is required on your first brief. Enter your brand name to continue.',
      );
    }

    const shouldPersistBrandName = !profileBrandName;

    const created = await this.prisma.$transaction(async (tx) => {
      if (shouldPersistBrandName) {
        await tx.brandProfile.update({
          where: { id: brand.id },
          data: { brandName: briefBrandName },
        });
      }

      return tx.brief.create({
        data: {
          brandId: brand.id,
          brandName: briefBrandName,
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
          ...(params.dto.toneStyle !== undefined
            ? { toneStyle: params.dto.toneStyle }
            : {}),
          keyNoteToInclude: params.dto.keyNoteToInclude,
          ctaNote: params.dto.ctaNote,
          referenceLinks: (params.dto.referenceLinks ?? []) as any,
          ...(script !== undefined ? { script: script as any } : {}),
          finalNotes: params.dto.finalNotes,
        },
        select: { id: true },
      });
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

  async updateBrief(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    briefId: string;
    dto: UpdateBriefDto;
  }): Promise<BriefDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const existing = await this.prisma.brief.findUnique({
      where: { id: params.briefId },
    });
    if (!existing) throw new NotFoundException('Brief not found');
    if (existing.brandId !== brand.id)
      throw new ForbiddenException('Not your brief');

    const dto = params.dto;
    const isProduct = dto.isProduct ?? existing.isProduct;
    const shipsPhysical =
      isProduct &&
      (dto.willShipPhysicalProductToCreator ??
        existing.willShipPhysicalProductToCreator);

    if (!isProduct && dto.willShipPhysicalProductToCreator) {
      throw new BadRequestException(
        'willShipPhysicalProductToCreator is only allowed for product briefs',
      );
    }

    // Optional replacement product image (must be a fresh temp upload key).
    const providedImageKey = dto.productImageKey?.trim();
    let finalizeImageKey: string | null = null;
    if (providedImageKey) {
      if (!isProduct) {
        throw new BadRequestException(
          'productImageKey is only allowed for product briefs',
        );
      }
      this.assertTempBriefProductImageKeyOwner(
        params.actorUserId,
        providedImageKey,
      );
      finalizeImageKey = providedImageKey;
    }

    const script = normalizeScriptInput(dto.script);

    const data: Record<string, unknown> = {
      isProduct,
      willShipPhysicalProductToCreator: shipsPhysical,
    };
    const setIfDefined = (key: keyof UpdateBriefDto): void => {
      if (dto[key] !== undefined) data[key as string] = dto[key];
    };
    setIfDefined('brandName');
    setIfDefined('industry');
    setIfDefined('brandLogoKey');
    setIfDefined('brandLogoUrl');
    setIfDefined('brandPronunciationAudioKey');
    setIfDefined('brandPronunciationAudioUrl');
    setIfDefined('productName');
    setIfDefined('productDescription');
    setIfDefined('productPageUrl');
    setIfDefined('shootLocationKind');
    setIfDefined('shootLocationAddress');
    setIfDefined('durationBucket');
    setIfDefined('contentType');
    setIfDefined('toneStyle');
    setIfDefined('keyNoteToInclude');
    setIfDefined('ctaNote');
    setIfDefined('finalNotes');
    if (dto.referenceLinks !== undefined) {
      data.referenceLinks = (dto.referenceLinks ?? []) as unknown;
    }
    if (script !== undefined) {
      data.script = script as unknown;
    }

    // Switching to a service brief clears any existing product image.
    if (dto.isProduct === false && existing.productImageKey) {
      data.productImageKey = null;
      data.productImageUrl = null;
      await this.storage.deleteObjectIfExists(existing.productImageKey);
    }

    await this.prisma.brief.update({
      where: { id: existing.id },
      data: data as any,
    });

    if (finalizeImageKey) {
      const finalKey = await this.storage.finalizeBriefProductImageKey({
        tempKey: finalizeImageKey,
        briefId: existing.id,
        deleteTemp: true,
      });
      await this.prisma.brief.update({
        where: { id: existing.id },
        data: {
          productImageKey: finalKey,
          productImageUrl: this.storage.buildCdnUrl(finalKey),
        },
      });
      if (existing.productImageKey && existing.productImageKey !== finalKey) {
        await this.storage.deleteObjectIfExists(existing.productImageKey);
      }
    }

    const updated = await this.prisma.brief.findUnique({
      where: { id: existing.id },
    });
    if (!updated) throw new NotFoundException('Brief not found');
    return mapBriefRow(updated);
  }

  async deleteBrief(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    briefId: string;
  }): Promise<void> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const existing = await this.prisma.brief.findUnique({
      where: { id: params.briefId },
      select: { id: true, brandId: true, productImageKey: true },
    });
    if (!existing) throw new NotFoundException('Brief not found');
    if (existing.brandId !== brand.id)
      throw new ForbiddenException('Not your brief');

    // A brief attached to an order backs that order's creative record
    // (Order.briefId). Deleting it would strip the brief the creator works
    // from, so block deletion while any order references it.
    const referencingOrders = await this.prisma.order.count({
      where: { briefId: existing.id },
    });
    if (referencingOrders > 0) {
      throw new BadRequestException(
        'This brief is attached to one or more orders and cannot be deleted.',
      );
    }

    await this.prisma.brief.delete({ where: { id: existing.id } });

    if (existing.productImageKey) {
      await this.storage.deleteObjectIfExists(existing.productImageKey);
    }
  }

  async attachBriefToOrder(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    briefId: string;
    orderId: string;
  }): Promise<void> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const brief = await this.prisma.brief.findUnique({
      where: { id: params.briefId },
      select: { id: true, brandId: true },
    });
    if (!brief) throw new NotFoundException('Brief not found');
    if (brief.brandId !== brand.id) throw new ForbiddenException('Not your brief');

    await this.ordersService.submitBrief({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
      orderId: params.orderId,
      briefId: params.briefId,
    });
  }

  /**
   * Attach one saved brief to many orders in a single action. The brief is
   * validated once (ownership + product-image requirement); each order is then
   * submitted independently so one bad order (already briefed, not found)
   * never blocks the rest. Per-order side effects (timeline start, realtime,
   * email) are handled by the reused OrdersService.submitBrief.
   */
  async attachBriefToOrders(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    briefId: string;
    orderIds: string[];
  }): Promise<AttachBriefToOrdersResponseDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const brief = await this.prisma.brief.findFirst({
      where: { id: params.briefId, brandId: brand.id },
      select: { id: true, isProduct: true, productImageKey: true },
    });
    if (!brief) throw new NotFoundException('Brief not found');
    if (brief.isProduct && !brief.productImageKey?.trim()) {
      throw new BadRequestException(
        'Brief must include a product image before it can be submitted to orders for product campaigns',
      );
    }

    // De-duplicate while preserving the caller's order.
    const orderIds = Array.from(new Set(params.orderIds));

    const results: AttachBriefToOrderResultDto[] = [];
    for (const orderId of orderIds) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            brandId: true,
            status: true,
            briefSubmittedAt: true,
          },
        });
        if (!order || order.brandId !== brand.id) {
          results.push({
            orderId,
            status: 'FAILED',
            message: 'Order not found',
          });
          continue;
        }
        if (order.status !== 'BRIEF_SUBMISSION_PENDING' || order.briefSubmittedAt) {
          results.push({
            orderId,
            status: 'SKIPPED',
            message: 'Order is not awaiting a brief',
          });
          continue;
        }

        await this.ordersService.submitBrief({
          actorUserId: params.actorUserId,
          brandProfileId: params.brandProfileId,
          orderId,
          briefId: params.briefId,
        });
        results.push({ orderId, status: 'SUBMITTED' });
      } catch (err) {
        results.push({
          orderId,
          status: 'FAILED',
          message:
            err instanceof Error ? err.message : 'Failed to submit brief',
        });
      }
    }

    return {
      results,
      submittedCount: results.filter((r) => r.status === 'SUBMITTED').length,
      skippedCount: results.filter((r) => r.status === 'SKIPPED').length,
      failedCount: results.filter((r) => r.status === 'FAILED').length,
    };
  }
}
