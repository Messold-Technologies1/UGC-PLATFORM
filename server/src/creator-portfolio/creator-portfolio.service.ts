import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PortfolioVideoAssetState,
  PortfolioVideoSource,
  PortfolioVisibilityStatus,
  Prisma,
  RoleName,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
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
import { playableAssetWhere } from './portfolio-video-asset.util';
import {
  type ImportInstagramReelsDto,
  type ImportInstagramReelsResponseDto,
  type ImportedReelDto,
  type SkippedReelDto,
} from './dto/import-instagram-reels.dto';

const MAX_SECTIONS_PER_CREATOR = 10;

@Injectable()
export class CreatorPortfolioService {
  private readonly logger = new Logger(CreatorPortfolioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
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

  /**
   * Refuse a video the creator already has, identified by the client-supplied
   * SHA-256. Called before handing out an upload URL so a duplicate costs no
   * transfer at all; `@@unique([creatorId, contentHash])` is the real guarantee
   * and catches races this check cannot.
   *
   * Only applies to videos. Thumbnails are derived images and may repeat.
   */
  private async assertNoDuplicateContent(
    creatorId: string,
    kind: 'video' | 'thumbnail',
    contentHash: string | undefined,
  ): Promise<void> {
    const hash = contentHash?.trim().toLowerCase();
    if (kind !== 'video' || !hash) return;

    const existing = await this.prisma.creatorPortfolioVideo.findFirst({
      where: { creatorId, contentHash: hash },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'This video is already in your portfolio. Pick a different file.',
      );
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
    await this.assertNoDuplicateContent(profile.id, dto.kind, dto.contentHash);
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
    await this.assertNoDuplicateContent(profile.id, dto.kind, dto.contentHash);
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

    // Portfolio videos carry no metadata, and there is no creator-facing
    // visibility control, so every new video is public. The column still gates
    // the go-live count and the public-profile queries; only its input is gone.
    const visibility = PortfolioVisibilityStatus.PUBLIC;

    const contentHash = dto.contentHash?.trim().toLowerCase() || null;
    if (contentHash) {
      await this.assertNoDuplicateContent(profile.id, 'video', contentHash);
    }

    const created = await this.createVideoRow({
      data: {
        creatorId: profile.id,
        contentHash,
        videoKey: dto.videoKey.trim(),
        videoUrl: this.storage.buildCdnUrl(dto.videoKey.trim()),
        thumbnailKey: thumbnailKey ?? null,
        thumbnailUrl: thumbnailKey
          ? this.storage.buildCdnUrl(thumbnailKey)
          : null,
        visibilityStatus: visibility,
      },
    });

    // A new public video may complete the ≥3-videos rule → latch completeProfile.
    await recomputeCreatorListingState(this.prisma, profile.id);

    return this.mapVideo(created);
  }

  /**
   * Turn selected Instagram reels into portfolio videos.
   *
   * The authorization boundary is that every id must already be cached against
   * a connection this creator owns — that is what stops someone importing
   * another creator's reel by guessing an id. It also means the reel has
   * already passed the REELS filter during the page walk, which is re-asserted
   * here as defence in depth.
   *
   * Returns immediately: each row is created PROCESSING with its S3 key already
   * allocated, and the mirror runs on its own queue. Generating the key here
   * rather than in the worker is what makes a mirror retry overwrite the same
   * object instead of orphaning a partial one.
   */
  async importInstagramReels(
    actingUserId: string,
    dto: ImportInstagramReelsDto,
    targetCreatorProfileId?: string,
  ): Promise<ImportInstagramReelsResponseDto> {
    const profile = await this.resolvePortfolioProfile(
      actingUserId,
      targetCreatorProfileId,
    );

    const cached = await this.prisma.instagramMediaItem.findMany({
      where: {
        igMediaId: { in: dto.igMediaIds },
        connection: { creatorProfileId: profile.id },
      },
      select: {
        id: true,
        igMediaId: true,
        permalink: true,
        postedAt: true,
        mediaUrl: true,
        mediaProductType: true,
        importedVideoId: true,
      },
    });
    const byId = new Map(cached.map((c) => [c.igMediaId, c]));

    const already = await this.prisma.creatorPortfolioVideo.findMany({
      where: { creatorId: profile.id, igMediaId: { in: dto.igMediaIds } },
      select: { igMediaId: true },
    });
    const alreadyImported = new Set(
      already.map((a) => a.igMediaId).filter((id): id is string => id != null),
    );

    const linkOnly =
      this.config.get<string>('PORTFOLIO_IG_IMPORT_MODE', 'mirror') === 'link';

    const imported: ImportedReelDto[] = [];
    const skipped: SkippedReelDto[] = [];
    const toMirror: string[] = [];

    for (const igMediaId of dto.igMediaIds) {
      const item = byId.get(igMediaId);
      if (!item) {
        skipped.push({ igMediaId, reason: 'not_found' });
        continue;
      }
      if (alreadyImported.has(igMediaId)) {
        skipped.push({ igMediaId, reason: 'already_imported' });
        continue;
      }
      if (item.mediaProductType !== 'REELS') {
        skipped.push({ igMediaId, reason: 'not_a_reel' });
        continue;
      }
      if (!item.mediaUrl && !linkOnly) {
        skipped.push({ igMediaId, reason: 'no_media_url' });
        continue;
      }

      // Allocate both keys up front so a mirror retry is idempotent.
      const videoKey = this.storage.buildObjectKey({
        kind: 'creator_portfolio_video',
        userId: profile.userId,
        creatorProfileId: profile.id,
        contentType: 'video/mp4',
      });
      const thumbnailKey = this.storage.buildObjectKey({
        kind: 'creator_portfolio_thumbnail',
        userId: profile.userId,
        creatorProfileId: profile.id,
        contentType: 'image/jpeg',
      });

      try {
        const created = await this.prisma.creatorPortfolioVideo.create({
          data: {
            creatorId: profile.id,
            source: PortfolioVideoSource.INSTAGRAM,
            assetState: linkOnly
              ? PortfolioVideoAssetState.LINK_ONLY
              : PortfolioVideoAssetState.PROCESSING,
            // In link mode the IG URL is the video; in mirror mode the URL
            // arrives when the job finishes, so it stays null until then.
            videoKey: linkOnly ? null : videoKey,
            videoUrl: linkOnly ? item.mediaUrl : null,
            thumbnailKey: linkOnly ? null : thumbnailKey,
            igMediaId,
            igPermalink: item.permalink,
            igPostedAt: item.postedAt,
            importedAt: new Date(),
            visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
          },
          select: { id: true, assetState: true },
        });

        // Dim the reel in the gallery.
        await this.prisma.instagramMediaItem.update({
          where: { id: item.id },
          data: { importedVideoId: created.id },
        });

        imported.push({
          id: created.id,
          igMediaId,
          assetState: created.assetState,
        });
        if (!linkOnly) toMirror.push(created.id);
      } catch (error) {
        // The unique index is the real guarantee: two concurrent imports of one
        // reel can both pass the check above and only it stops the second.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          skipped.push({ igMediaId, reason: 'already_imported' });
          continue;
        }
        throw error;
      }
    }

    if (imported.length > 0) {
      // A LINK_ONLY import is immediately playable, so it can complete the
      // three-video rule. A PROCESSING one cannot, and playableAssetWhere()
      // makes the recompute agree.
      await recomputeCreatorListingState(this.prisma, profile.id);
    }

    return {
      imported,
      skipped,
      mirrorVideoIds: toMirror,
    } as ImportInstagramReelsResponseDto & { mirrorVideoIds: string[] };
  }

  /**
   * Guard for the retry endpoint: the video must belong to this creator, be an
   * Instagram import, and actually be in FAILED. Retrying anything else is
   * either a mistake or an attempt to re-run a mirror against someone else's row.
   */
  async assertOwnedFailedImport(
    actingUserId: string,
    videoId: string,
  ): Promise<void> {
    const profile = await this.getCreatorProfileOrThrow(actingUserId);
    const video = await this.prisma.creatorPortfolioVideo.findUnique({
      where: { id: videoId },
      select: { creatorId: true, source: true, assetState: true },
    });
    if (!video) throw new NotFoundException('Video not found');
    if (video.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to retry this video');
    }
    if (video.source !== PortfolioVideoSource.INSTAGRAM) {
      throw new BadRequestException('Only Instagram imports are mirrored');
    }
    if (video.assetState !== PortfolioVideoAssetState.FAILED) {
      throw new BadRequestException(
        `This video is ${video.assetState.toLowerCase()}, not failed — nothing to retry.`,
      );
    }
  }

  async listMyVideos(userId: string) {
    const profile = await this.getCreatorProfileOrThrow(userId);
    const rows = await this.prisma.creatorPortfolioVideo.findMany({
      where: { creatorId: profile.id },
      orderBy: { createdAt: 'desc' },
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
        ...playableAssetWhere(),
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => this.mapVideo(r));
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
      select: {
        id: true,
        creatorId: true,
        videoKey: true,
        thumbnailKey: true,
      },
    });
    if (!existing) throw new NotFoundException('Video not found');
    if (existing.creatorId !== profile.id) {
      throw new ForbiddenException('Not allowed to update this video');
    }

    // ---- Replace-the-file ----
    // A portfolio at MIN_PORTFOLIO_VIDEOS refuses deletes, so replacing is the
    // only way to change a video there. The new object is already in S3 under a
    // fresh key: we never overwrite the old key, because the CDN would keep
    // serving the previous clip until its TTL expired.
    const nextVideoKey = dto.videoKey?.trim() || undefined;
    const nextThumbnailKey = dto.thumbnailKey?.trim() || undefined;
    if (nextVideoKey) this.assertVideoKeyOwner(profile.id, nextVideoKey);
    if (nextThumbnailKey) {
      this.assertThumbnailKeyOwner(profile.id, nextThumbnailKey);
    }

    // A thumbnail belongs to the clip it was cut from, so a replacement video
    // that arrives without one clears the old thumbnail instead of inheriting
    // it — otherwise the grid shows a frame of a video that is no longer there.
    const clearStaleThumbnail = Boolean(nextVideoKey) && !nextThumbnailKey;

    // The only thing an update can change now is the file itself, so the
    // transaction is just the row write plus the listing-state recompute. The
    // raised timeout is kept: this ran long enough under production load to
    // trip P2028.
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const video = await tx.creatorPortfolioVideo.update({
          where: { id: videoId },
          data: {
            videoKey: nextVideoKey,
            videoUrl: nextVideoKey
              ? this.storage.buildCdnUrl(nextVideoKey)
              : undefined,
            thumbnailKey: clearStaleThumbnail ? null : nextThumbnailKey,
            thumbnailUrl: clearStaleThumbnail
              ? null
              : nextThumbnailKey
                ? this.storage.buildCdnUrl(nextThumbnailKey)
                : undefined,
          },
        });

        await recomputeCreatorListingState(tx, profile.id);

        return video;
      },
      { timeout: 15000, maxWait: 10000 },
    );

    // Drop the objects the replacement superseded. Deliberately *after* the
    // transaction commits: doing it inside would delete the still-live video if
    // the transaction then rolled back. Best-effort — a storage failure must not
    // fail an update the creator already made, it only leaves an orphan for
    // the reclaim script to sweep.
    if (
      nextVideoKey &&
      existing.videoKey &&
      existing.videoKey !== nextVideoKey
    ) {
      await this.deleteStorageObject(
        existing.videoKey,
        `replaced portfolio video ${videoId}`,
      );
    }
    const outgoingThumbnailKey = existing.thumbnailKey;
    if (
      outgoingThumbnailKey &&
      (clearStaleThumbnail ||
        (nextThumbnailKey && outgoingThumbnailKey !== nextThumbnailKey))
    ) {
      await this.deleteStorageObject(
        outgoingThumbnailKey,
        `replaced portfolio thumbnail ${videoId}`,
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
      select: {
        id: true,
        creatorId: true,
        videoKey: true,
        thumbnailKey: true,
      },
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

    // The row is gone, so nothing points at these objects any more. Best-effort
    // and never fatal: the delete the creator asked for has already happened,
    // and a storage failure here only leaves an orphan behind.
    await this.deleteStorageObject(
      existing.videoKey,
      `deleted portfolio video ${videoId}`,
    );
    await this.deleteStorageObject(
      existing.thumbnailKey,
      `deleted portfolio thumbnail ${videoId}`,
    );
  }

  /**
   * Create the row, translating the (creatorId, contentHash) unique-constraint
   * violation into the same message as the pre-upload check. That check races:
   * two uploads of one file can both pass it and only the index stops the
   * second, so the error surfaces as a 400 rather than a 500.
   */
  private async createVideoRow(
    args: Parameters<PrismaService['creatorPortfolioVideo']['create']>[0],
  ) {
    try {
      return await this.prisma.creatorPortfolioVideo.create(args);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        String(error.meta?.target ?? '').includes('contentHash')
      ) {
        throw new BadRequestException(
          'This video is already in your portfolio. Pick a different file.',
        );
      }
      throw error;
    }
  }

  /** Remove an S3 object, logging rather than throwing. No-op for a null key. */
  private async deleteStorageObject(
    key: string | null | undefined,
    context: string,
  ): Promise<void> {
    if (!key) return;
    await this.storage
      .deleteObjectIfExists(key)
      .catch((err) =>
        this.logger.warn(`Failed to delete ${context} key ${key}: ${err}`),
      );
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
      source: row.source,
      assetState: row.assetState,
      igPermalink: row.igPermalink ?? null,
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

  async listMySections(userId: string): Promise<PortfolioSectionResponseDto[]> {
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
