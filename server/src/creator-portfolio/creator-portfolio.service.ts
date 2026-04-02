import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PortfolioVisibilityStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePortfolioVideoDto } from './dto/create-portfolio-video.dto';
import { PresignPortfolioUploadDto } from './dto/presign-portfolio-upload.dto';
import { UpdatePortfolioVideoDto } from './dto/update-portfolio-video.dto';
import { PortfolioVideoResponseDto } from './dto/portfolio-video-response.dto';

function normalizeList(values: string[] | undefined): string[] {
  if (!values) return [];
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function normalizeSuggestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

@Injectable()
export class CreatorPortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}


  private async getCreatorProfileOrThrow(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Creator profile not found');
    return profile;
  }

  private assertVideoKeyOwner(creatorId: string, key: string): void {
    const prefix = `creator-portfolio/${creatorId}/videos/`;
    if (!key.startsWith(prefix)) {
      throw new ForbiddenException('Invalid videoKey');
    }
  }

  private assertThumbnailKeyOwner(creatorId: string, key: string): void {
    const prefix = `creator-portfolio/${creatorId}/thumbnails/`;
    if (!key.startsWith(prefix)) {
      throw new ForbiddenException('Invalid thumbnailKey');
    }
  }

  async presignUpload(userId: string, dto: PresignPortfolioUploadDto) {
   

    const profile = await this.getCreatorProfileOrThrow(userId);
    const kind =
      dto.kind === 'video'
        ? 'creator_portfolio_video'
        : 'creator_portfolio_thumbnail';
    const key = this.storage.buildObjectKey({
      kind,
      userId,
      creatorProfileId: profile.id,
      contentType: dto.contentType,
    });
    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  async createVideo(userId: string, dto: CreatePortfolioVideoDto) {
   

    const profile = await this.getCreatorProfileOrThrow(userId);
    this.assertVideoKeyOwner(profile.id, dto.videoKey.trim());
    const thumbnailKey = dto.thumbnailKey?.trim();
    if (thumbnailKey) this.assertThumbnailKeyOwner(profile.id, thumbnailKey);

    const tags = normalizeList(dto.tags);
    const visibility =
      dto.visibilityStatus === 'public'
        ? PortfolioVisibilityStatus.PUBLIC
        : PortfolioVisibilityStatus.PRIVATE;

    const industryLabel = dto.industryLabel?.trim();
    const language = dto.language?.trim();

    await Promise.all([
      industryLabel
        ? this.prisma.portfolioIndustrySuggestion.createMany({
            data: [
              {
                name: industryLabel,
                normalizedName: normalizeSuggestion(industryLabel),
              },
            ],
            skipDuplicates: true,
          })
        : Promise.resolve(),
      language
        ? this.prisma.portfolioLanguageSuggestion.createMany({
            data: [
              {
                name: language,
                normalizedName: normalizeSuggestion(language),
              },
            ],
            skipDuplicates: true,
          })
        : Promise.resolve(),
      tags.length
        ? this.prisma.portfolioTagSuggestion.createMany({
            data: tags.map((tag) => ({
              name: tag,
              normalizedName: normalizeSuggestion(tag),
            })),
            skipDuplicates: true,
          })
        : Promise.resolve(),
    ]);

    const created = await this.prisma.creatorPortfolioVideo.create({
      data: {
        creatorId: profile.id,
        videoKey: dto.videoKey.trim(),
        videoUrl: this.storage.buildCdnUrl(dto.videoKey.trim()),
        thumbnailKey: thumbnailKey ?? null,
        thumbnailUrl: thumbnailKey ? this.storage.buildCdnUrl(thumbnailKey) : null,
        industryLabel: industryLabel || null,
        language: language || null,
        description: dto.description?.trim() || null,
        visibilityStatus: visibility,
        tags: tags.length
          ? {
              createMany: {
                data: tags.map((tag) => ({ tag })),
                skipDuplicates: true,
              },
            }
          : undefined,
      } as any,
      include: { tags: true },
    });

    return this.mapVideo(created);
  }

  async listMyVideos(userId: string) {
    const profile = await this.getCreatorProfileOrThrow(userId);
    const rows = await this.prisma.creatorPortfolioVideo.findMany({
      where: { creatorId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: { tags: true },
    });
    return rows.map((r) => this.mapVideo(r));
  }

  async listPublicVideosByCreatorId(creatorId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    const rows = await this.prisma.creatorPortfolioVideo.findMany({
      where: {
        creatorId: creator.id,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      },
      orderBy: { createdAt: 'desc' },
      include: { tags: true },
    });

    return rows.map((r) => this.mapVideo(r));
  }

  async listIndustrySuggestions(limit = 50): Promise<string[]> {
    const rows = await this.prisma.portfolioIndustrySuggestion.findMany({
      take: limit,
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    return rows.map((r) => r.name);
  }

  async listTagSuggestions(limit = 50): Promise<string[]> {
    const rows = await this.prisma.portfolioTagSuggestion.findMany({
      take: limit,
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    return rows.map((r) => r.name);
  }

  async listLanguageSuggestions(limit = 50): Promise<string[]> {
    const rows = await this.prisma.portfolioLanguageSuggestion.findMany({
      take: limit,
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    return rows.map((r) => r.name);
  }

  async updateVideo(userId: string, videoId: string, dto: UpdatePortfolioVideoDto) {
    const profile = await this.getCreatorProfileOrThrow(userId);
    const existing = await this.prisma.creatorPortfolioVideo.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true },
    });
    if (!existing) throw new NotFoundException('Video not found');
    if (existing.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to update this video');
    }

    const tags = dto.tags ? normalizeList(dto.tags) : undefined;
    const visibility =
      dto.visibilityStatus === undefined
        ? undefined
        : dto.visibilityStatus === 'public'
          ? PortfolioVisibilityStatus.PUBLIC
          : PortfolioVisibilityStatus.PRIVATE;

    return this.prisma.$transaction(async (tx) => {
      if (tags) {
        await tx.creatorPortfolioVideoTag.deleteMany({ where: { videoId } });
        if (tags.length) {
          await tx.creatorPortfolioVideoTag.createMany({
            data: tags.map((tag) => ({ videoId, tag })),
            skipDuplicates: true,
          });
        }
      }

      const industryLabel =
        dto.industryLabel !== undefined ? dto.industryLabel.trim() : undefined;
      const language = dto.language !== undefined ? dto.language.trim() : undefined;

      await Promise.all([
        industryLabel
          ? tx.portfolioIndustrySuggestion.createMany({
              data: [
                {
                  name: industryLabel,
                  normalizedName: normalizeSuggestion(industryLabel),
                },
              ],
              skipDuplicates: true,
            })
          : Promise.resolve(),
        language
          ? tx.portfolioLanguageSuggestion.createMany({
              data: [
                {
                  name: language,
                  normalizedName: normalizeSuggestion(language),
                },
              ],
              skipDuplicates: true,
            })
          : Promise.resolve(),
        tags?.length
          ? tx.portfolioTagSuggestion.createMany({
              data: tags.map((tag) => ({
                name: tag,
                normalizedName: normalizeSuggestion(tag),
              })),
              skipDuplicates: true,
            })
          : Promise.resolve(),
      ]);

      const updated = await tx.creatorPortfolioVideo.update({
        where: { id: videoId },
        data: {
          industryLabel:
            industryLabel !== undefined ? industryLabel || null : undefined,
          language: language !== undefined ? language || null : undefined,
          description:
            dto.description !== undefined ? dto.description.trim() || null : undefined,
          visibilityStatus: visibility,
        } as any,
        include: { tags: true },
      });

      return this.mapVideo(updated);
    });
  }

  async deleteVideo(userId: string, videoId: string): Promise<void> {
    const profile = await this.getCreatorProfileOrThrow(userId);
    const existing = await this.prisma.creatorPortfolioVideo.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true },
    });
    if (!existing) throw new NotFoundException('Video not found');
    if (existing.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to delete this video');
    }
    await this.prisma.creatorPortfolioVideo.delete({ where: { id: videoId } });
  }

  private mapVideo(row: any) {
    const visibilityStatus: 'public' | 'private' =
      row.visibilityStatus === PortfolioVisibilityStatus.PUBLIC
        ? 'public'
        : 'private';

    return {
      id: row.id,
      creatorId: row.creatorId,
      videoUrl: row.videoUrl,
      thumbnailUrl: row.thumbnailUrl ?? null,
      industryLabel: row.industryLabel ?? null,
      tags: (row.tags ?? []).map((t: any) => t.tag),
      language: row.language ?? null,
      description: row.description ?? null,
      visibilityStatus,
      createdAt: row.createdAt,
    } satisfies PortfolioVideoResponseDto;
  }
}

