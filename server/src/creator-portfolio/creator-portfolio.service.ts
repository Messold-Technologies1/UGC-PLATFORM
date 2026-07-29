import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PortfolioVisibilityStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePortfolioVideoDto } from './dto/create-portfolio-video.dto';
import { PresignPortfolioUploadDto } from './dto/presign-portfolio-upload.dto';
import {
  AbortMultipartUploadDto,
  CompleteMultipartUploadDto,
  CreateMultipartUploadDto,
  SignMultipartPartDto,
} from './dto/multipart-portfolio-upload.dto';
import { UpdatePortfolioVideoDto } from './dto/update-portfolio-video.dto';
import { PortfolioVideoResponseDto } from './dto/portfolio-video-response.dto';
import { CreatePortfolioSectionDto } from './dto/create-portfolio-section.dto';
import { UpdatePortfolioSectionDto } from './dto/update-portfolio-section.dto';
import { AddSectionVideosDto } from './dto/add-section-videos.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import {
  PortfolioSectionResponseDto,
  PortfolioSectionVideoItemDto,
} from './dto/portfolio-section-response.dto';
import { recomputeCreatorListingState } from '../creator-profile/creator-listing-state.util';
import { MIN_PORTFOLIO_VIDEOS } from '../creator-profile/creator-profile-completeness.util';

function normalizeList(values: string[] | undefined): string[] {
  if (!values) return [];
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function normalizeSuggestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Title-case each alphanumeric word (e.g. "real estate" → "Real Estate"). */
function toTitleCaseLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[A-Za-z0-9]+/g, (word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    );
}

const MAX_SECTIONS_PER_CREATOR = 10;

@Injectable()
export class CreatorPortfolioService {
  private readonly logger = new Logger(CreatorPortfolioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async isAdminUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) return false;
    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    return user.userRoles.some((ur) => ur.role.name === RoleName.ADMIN);
  }

  private async assertAdminUser(userId: string): Promise<void> {
    if (!(await this.isAdminUser(userId))) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private async getCreatorProfileOrThrow(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Creator profile not found');
    return profile;
  }

  private async getCreatorProfileByIdOrThrow(creatorProfileId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Creator profile not found');
    return profile;
  }

  /** Creator self-service, or admin acting on a specific creator profile. */
  private async resolvePortfolioProfile(
    actingUserId: string,
    targetCreatorProfileId?: string,
  ) {
    if (targetCreatorProfileId) {
      await this.assertAdminUser(actingUserId);
      return this.getCreatorProfileByIdOrThrow(targetCreatorProfileId);
    }
    return this.getCreatorProfileOrThrow(actingUserId);
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

  async presignUpload(
    actingUserId: string,
    dto: PresignPortfolioUploadDto,
    targetCreatorProfileId?: string,
  ) {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );
    const kind =
      dto.kind === 'video'
        ? 'creator_portfolio_video'
        : 'creator_portfolio_thumbnail';
    const key = this.storage.buildObjectKey({
      kind,
      userId: profile.userId,
      creatorProfileId: profile.id,
      contentType: dto.contentType,
    });
    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  /** Owner check for a portfolio media key covering both videos and thumbnails. */
  private assertOwnedMediaKey(creatorId: string, key: string): void {
    const videoPrefix = `creator-portfolio/${creatorId}/videos/`;
    const thumbPrefix = `creator-portfolio/${creatorId}/thumbnails/`;
    if (!key.startsWith(videoPrefix) && !key.startsWith(thumbPrefix)) {
      throw new ForbiddenException('Invalid upload key');
    }
  }

  async createMultipartUpload(
    actingUserId: string,
    dto: CreateMultipartUploadDto,
  ) {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      dto.creatorId,
    );
    const kind =
      dto.kind === 'video'
        ? 'creator_portfolio_video'
        : 'creator_portfolio_thumbnail';
    const key = this.storage.buildObjectKey({
      kind,
      userId: profile.userId,
      creatorProfileId: profile.id,
      contentType: dto.contentType,
    });
    return this.storage.createMultipartUpload({
      key,
      contentType: dto.contentType,
    });
  }

  async signMultipartPart(actingUserId: string, dto: SignMultipartPartDto) {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      dto.creatorId,
    );
    this.assertOwnedMediaKey(profile.id, dto.key);
    const url = await this.storage.signUploadPart({
      key: dto.key,
      uploadId: dto.uploadId,
      partNumber: dto.partNumber,
    });
    return { url };
  }

  async completeMultipartUpload(
    actingUserId: string,
    dto: CompleteMultipartUploadDto,
  ) {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      dto.creatorId,
    );
    this.assertOwnedMediaKey(profile.id, dto.key);
    const key = await this.storage.completeMultipartUpload({
      key: dto.key,
      uploadId: dto.uploadId,
      parts: dto.parts,
    });
    return { key, cdnUrl: this.storage.buildCdnUrl(key) };
  }

  async abortMultipartUpload(
    actingUserId: string,
    dto: AbortMultipartUploadDto,
  ): Promise<void> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      dto.creatorId,
    );
    this.assertOwnedMediaKey(profile.id, dto.key);
    await this.storage.abortMultipartUpload({
      key: dto.key,
      uploadId: dto.uploadId,
    });
  }

  async createVideo(
    actingUserId: string,
    dto: CreatePortfolioVideoDto,
    targetCreatorProfileId?: string,
  ) {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );
    this.assertVideoKeyOwner(profile.id, dto.videoKey.trim());
    const thumbnailKey = dto.thumbnailKey?.trim();
    if (thumbnailKey) this.assertThumbnailKeyOwner(profile.id, thumbnailKey);

    const tags = normalizeList(dto.tags);
    const visibility =
      dto.visibilityStatus === 'public'
        ? PortfolioVisibilityStatus.PUBLIC
        : PortfolioVisibilityStatus.PRIVATE;

    const industryLabel = dto.industryLabel?.trim()
      ? toTitleCaseLabel(dto.industryLabel)
      : undefined;
    const language = dto.language?.trim();

    await Promise.all([
      industryLabel
        ? this.prisma.portfolioIndustrySuggestion.upsert({
            where: { normalizedName: normalizeSuggestion(industryLabel) },
            create: {
              name: industryLabel,
              normalizedName: normalizeSuggestion(industryLabel),
            },
            update: { name: industryLabel },
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

    // A new public video may complete the ≥3-videos rule → latch completeProfile.
    if (visibility === PortfolioVisibilityStatus.PUBLIC) {
      await recomputeCreatorListingState(this.prisma, profile.id);
    }

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

  async listAllVideosForAdmin(
    actingUserId: string,
    creatorProfileId?: string,
  ): Promise<PortfolioVideoResponseDto[]> {
    await this.assertAdminUser(actingUserId);

    if (creatorProfileId) {
      await this.getCreatorProfileByIdOrThrow(creatorProfileId);
    }

    const rows = await this.prisma.creatorPortfolioVideo.findMany({
      where: creatorProfileId ? { creatorId: creatorProfileId } : undefined,
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

  async updateVideo(
    actingUserId: string,
    videoId: string,
    dto: UpdatePortfolioVideoDto,
    targetCreatorProfileId?: string,
  ) {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );
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

    const industryLabel =
      dto.industryLabel !== undefined
        ? dto.industryLabel.trim()
          ? toTitleCaseLabel(dto.industryLabel)
          : ''
        : undefined;
    const language = dto.language !== undefined ? dto.language.trim() : undefined;

    // Keep only the writes that must be atomic with the video update inside the
    // transaction: the video's own tags, the video row, and the listing-state
    // recompute (flipping a video to public may complete the ≥3-videos rule).
    // The interactive-transaction timeout is raised from the 5s default because
    // this ran long enough under production load to trip P2028.
    const updated = await this.prisma.$transaction(
      async (tx) => {
        if (tags) {
          await tx.creatorPortfolioVideoTag.deleteMany({ where: { videoId } });
          if (tags.length) {
            await tx.creatorPortfolioVideoTag.createMany({
              data: tags.map((tag) => ({ videoId, tag })),
              skipDuplicates: true,
            });
          }
        }

        const video = await tx.creatorPortfolioVideo.update({
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

        await recomputeCreatorListingState(tx, profile.id);

        return video;
      },
      { timeout: 15000, maxWait: 10000 },
    );

    // Best-effort autocomplete catalog upserts. These are not critical to the
    // video write and do not need to be atomic with it, so they run outside the
    // transaction to keep its duration short. A failure here must not fail the
    // update the creator already made.
    try {
      await Promise.all([
        industryLabel
          ? this.prisma.portfolioIndustrySuggestion.upsert({
              where: { normalizedName: normalizeSuggestion(industryLabel) },
              create: {
                name: industryLabel,
                normalizedName: normalizeSuggestion(industryLabel),
              },
              update: { name: industryLabel },
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
        tags?.length
          ? this.prisma.portfolioTagSuggestion.createMany({
              data: tags.map((tag) => ({
                name: tag,
                normalizedName: normalizeSuggestion(tag),
              })),
              skipDuplicates: true,
            })
          : Promise.resolve(),
      ]);
    } catch (error) {
      this.logger.warn(
        `Failed to update portfolio suggestion catalog for video ${videoId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return this.mapVideo(updated);
  }

  async deleteVideo(
    actingUserId: string,
    videoId: string,
    targetCreatorProfileId?: string,
  ): Promise<void> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );
    const existing = await this.prisma.creatorPortfolioVideo.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true },
    });
    if (!existing) throw new NotFoundException('Video not found');
    if (existing.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to delete this video');
    }

    // A portfolio must always keep at least MIN_PORTFOLIO_VIDEOS videos. Once at
    // the floor the creator must replace an existing video rather than delete
    // one. Enforced here (not just in the UI) so the rule can't be bypassed via
    // the API.
    const videoCount = await this.prisma.creatorPortfolioVideo.count({
      where: { creatorId: profile.id },
    });
    if (videoCount <= MIN_PORTFOLIO_VIDEOS) {
      throw new BadRequestException(
        `A portfolio must keep at least ${MIN_PORTFOLIO_VIDEOS} videos. Replace an existing video instead of deleting it.`,
      );
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


  private readonly sectionInclude = {
    videos: {
      orderBy: { position: 'asc' as const },
      include: {
        video: {
          select: {
            id: true,
            videoUrl: true,
            thumbnailUrl: true,
          },
        },
      },
    },
  };

  async createSection(
    actingUserId: string,
    dto: CreatePortfolioSectionDto,
    targetCreatorProfileId?: string,
  ): Promise<PortfolioSectionResponseDto> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );

    const existingCount = await this.prisma.creatorPortfolioSection.count({
      where: { creatorId: profile.id },
    });
    if (existingCount >= MAX_SECTIONS_PER_CREATOR) {
      throw new BadRequestException(
        `Maximum of ${MAX_SECTIONS_PER_CREATOR} sections allowed per creator`,
      );
    }

    const section = await this.prisma.creatorPortfolioSection.create({
      data: {
        creatorId: profile.id,
        name: dto.name.trim(),
        position: dto.position ?? existingCount,
      },
      include: this.sectionInclude,
    });

    return this.mapSection(section);
  }

  async listMySections(
    userId: string,
  ): Promise<PortfolioSectionResponseDto[]> {
    const profile = await this.getCreatorProfileOrThrow(userId);

    const sections = await this.prisma.creatorPortfolioSection.findMany({
      where: { creatorId: profile.id },
      orderBy: { position: 'asc' },
      include: this.sectionInclude,
    });

    return sections.map((s) => this.mapSection(s));
  }

  async updateSection(
    actingUserId: string,
    sectionId: string,
    dto: UpdatePortfolioSectionDto,
    targetCreatorProfileId?: string,
  ): Promise<PortfolioSectionResponseDto> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );

    const existing = await this.prisma.creatorPortfolioSection.findUnique({
      where: { id: sectionId },
      select: { id: true, creatorId: true },
    });
    if (!existing) throw new NotFoundException('Section not found');
    if (existing.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to update this section');
    }

    const updated = await this.prisma.creatorPortfolioSection.update({
      where: { id: sectionId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        position: dto.position,
      },
      include: this.sectionInclude,
    });

    return this.mapSection(updated);
  }

  async deleteSection(
    actingUserId: string,
    sectionId: string,
    targetCreatorProfileId?: string,
  ): Promise<void> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );

    const existing = await this.prisma.creatorPortfolioSection.findUnique({
      where: { id: sectionId },
      select: { id: true, creatorId: true },
    });
    if (!existing) throw new NotFoundException('Section not found');
    if (existing.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to delete this section');
    }

    await this.prisma.creatorPortfolioSection.delete({
      where: { id: sectionId },
    });
  }

  async reorderSections(
    actingUserId: string,
    dto: ReorderSectionsDto,
    targetCreatorProfileId?: string,
  ): Promise<PortfolioSectionResponseDto[]> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );

    const sectionIds = dto.sections.map((s) => s.id);
    const owned = await this.prisma.creatorPortfolioSection.findMany({
      where: { id: { in: sectionIds }, creatorId: profile.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((s) => s.id));
    const unowned = sectionIds.filter((id) => !ownedIds.has(id));
    if (unowned.length > 0) {
      throw new ForbiddenException(
        `Sections not owned by this creator: ${unowned.join(', ')}`,
      );
    }

    await this.prisma.$transaction(
      dto.sections.map((s) =>
        this.prisma.creatorPortfolioSection.update({
          where: { id: s.id },
          data: { position: s.position },
        }),
      ),
    );

    const sections = await this.prisma.creatorPortfolioSection.findMany({
      where: { creatorId: profile.id },
      orderBy: { position: 'asc' },
      include: this.sectionInclude,
    });

    return sections.map((s) => this.mapSection(s));
  }

  async addVideosToSection(
    actingUserId: string,
    sectionId: string,
    dto: AddSectionVideosDto,
    targetCreatorProfileId?: string,
  ): Promise<PortfolioSectionResponseDto> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );

    const section = await this.prisma.creatorPortfolioSection.findUnique({
      where: { id: sectionId },
      select: { id: true, creatorId: true },
    });
    if (!section) throw new NotFoundException('Section not found');
    if (section.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to modify this section');
    }

    const videoIds = dto.videos.map((v) => v.videoId);
    const ownedVideos = await this.prisma.creatorPortfolioVideo.findMany({
      where: { id: { in: videoIds }, creatorId: profile.id },
      select: { id: true },
    });
    const ownedVideoIds = new Set(ownedVideos.map((v) => v.id));
    const unownedVideos = videoIds.filter((id) => !ownedVideoIds.has(id));
    if (unownedVideos.length > 0) {
      throw new ForbiddenException(
        `Videos not owned by this creator: ${unownedVideos.join(', ')}`,
      );
    }

    await this.prisma.$transaction(
      dto.videos.map((v) =>
        this.prisma.creatorPortfolioSectionVideo.upsert({
          where: {
            sectionId_videoId: { sectionId, videoId: v.videoId },
          },
          create: {
            sectionId,
            videoId: v.videoId,
            position: v.position,
          },
          update: { position: v.position },
        }),
      ),
    );

    const updated = await this.prisma.creatorPortfolioSection.findUniqueOrThrow(
      {
        where: { id: sectionId },
        include: this.sectionInclude,
      },
    );

    return this.mapSection(updated);
  }

  async removeVideoFromSection(
    actingUserId: string,
    sectionId: string,
    videoId: string,
    targetCreatorProfileId?: string,
  ): Promise<void> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );

    const section = await this.prisma.creatorPortfolioSection.findUnique({
      where: { id: sectionId },
      select: { id: true, creatorId: true },
    });
    if (!section) throw new NotFoundException('Section not found');
    if (section.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to modify this section');
    }

    await this.prisma.creatorPortfolioSectionVideo.deleteMany({
      where: { sectionId, videoId },
    });
  }

  private mapSection(row: any): PortfolioSectionResponseDto {
    return {
      id: row.id,
      creatorId: row.creatorId,
      name: row.name,
      position: row.position,
      createdAt: row.createdAt,
      videos: (row.videos ?? []).map(
        (sv: any): PortfolioSectionVideoItemDto => ({
          videoId: sv.videoId,
          position: sv.position,
          videoUrl: sv.video.videoUrl,
          thumbnailUrl: sv.video.thumbnailUrl ?? null,
        }),
      ),
    };
  }
}

