import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBriefDto } from './dto/create-brief.dto';
import type { BriefDto } from './dto/brief.dto';

function mapReferenceLinks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

@Injectable()
export class BriefsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBrief(params: {
    brandUserId: string;
    dto: CreateBriefDto;
  }): Promise<{ id: string }> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

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
        contentType: params.dto.contentType,
        toneStyle: params.dto.toneStyle,
        referenceLinks: (params.dto.referenceLinks ?? []) as any,
        finalNotes: params.dto.finalNotes,
      },
      select: { id: true },
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

    return rows.map((b) => ({
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
      willShipPhysicalProductToCreator: b.willShipPhysicalProductToCreator,
      shootLocationKind: b.shootLocationKind ?? null,
      shootLocationAddress: b.shootLocationAddress ?? null,
      durationBucket: b.durationBucket ?? null,
      contentType: b.contentType ?? null,
      toneStyle: b.toneStyle ?? null,
      referenceLinks: mapReferenceLinks(b.referenceLinks),
      finalNotes: b.finalNotes ?? null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
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

    return {
      id: brief.id,
      brandName: brief.brandName ?? null,
      brandPronunciationAudioKey: brief.brandPronunciationAudioKey ?? null,
      brandPronunciationAudioUrl: brief.brandPronunciationAudioUrl ?? null,
      industry: brief.industry ?? null,
      brandLogoKey: brief.brandLogoKey ?? null,
      brandLogoUrl: brief.brandLogoUrl ?? null,
      productName: brief.productName ?? null,
      productDescription: brief.productDescription ?? null,
      productPageUrl: brief.productPageUrl ?? null,
      willShipPhysicalProductToCreator: brief.willShipPhysicalProductToCreator,
      shootLocationKind: brief.shootLocationKind ?? null,
      shootLocationAddress: brief.shootLocationAddress ?? null,
      durationBucket: brief.durationBucket ?? null,
      contentType: brief.contentType ?? null,
      toneStyle: brief.toneStyle ?? null,
      referenceLinks: mapReferenceLinks(brief.referenceLinks),
      finalNotes: brief.finalNotes ?? null,
      createdAt: brief.createdAt,
      updatedAt: brief.updatedAt,
    };
  }
}

