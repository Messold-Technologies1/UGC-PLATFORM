import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateDemoVideoDto } from './dto/create-demo-video.dto';
import { UpdateDemoVideoDto } from './dto/update-demo-video.dto';
import { PresignDemoVideoUploadDto } from './dto/presign-demo-video-upload.dto';
import { DemoVideoResponseDto } from './dto/demo-video-response.dto';

function toResponseDto(video: {
  id: string;
  title: string;
  caption: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DemoVideoResponseDto {
  return {
    id: video.id,
    title: video.title,
    caption: video.caption,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    sortOrder: video.sortOrder,
    active: video.active,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

@Injectable()
export class CreatorDemoVideosService {
  private readonly logger = new Logger(CreatorDemoVideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private assertKeyOwner(key: string, prefix: string, label: string): void {
    if (!key.startsWith(prefix)) {
      throw new NotFoundException(`Invalid ${label}`);
    }
  }

  async presignUpload(
    actingUserId: string,
    dto: PresignDemoVideoUploadDto,
  ): Promise<{
    key: string;
    uploadUrl: string;
    headers: Record<string, string>;
    expiresInSeconds: number;
    cdnUrl: string;
  }> {
    const kind =
      dto.kind === 'video' ? 'creator_demo_video' : 'creator_demo_video_thumbnail';
    const key = this.storage.buildObjectKey({
      kind,
      userId: actingUserId,
      contentType: dto.contentType,
    });
    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  /** Public: active videos ordered for display, oldest sortOrder first. */
  async listActive(): Promise<DemoVideoResponseDto[]> {
    const videos = await this.prisma.creatorDemoVideo.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return videos.map(toResponseDto);
  }

  /** Admin: every video, including inactive, ordered for management. */
  async listAllForAdmin(): Promise<DemoVideoResponseDto[]> {
    const videos = await this.prisma.creatorDemoVideo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return videos.map(toResponseDto);
  }

  async create(dto: CreateDemoVideoDto): Promise<DemoVideoResponseDto> {
    this.assertKeyOwner(dto.videoKey, 'creator-demo-videos/', 'videoKey');
    if (dto.thumbnailKey) {
      this.assertKeyOwner(
        dto.thumbnailKey,
        'creator-demo-videos/thumbnails/',
        'thumbnailKey',
      );
    }

    const video = await this.prisma.creatorDemoVideo.create({
      data: {
        title: dto.title.trim(),
        caption: dto.caption?.trim() || null,
        videoKey: dto.videoKey,
        videoUrl: this.storage.buildCdnUrl(dto.videoKey),
        thumbnailKey: dto.thumbnailKey ?? null,
        thumbnailUrl: dto.thumbnailKey
          ? this.storage.buildCdnUrl(dto.thumbnailKey)
          : null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
    return toResponseDto(video);
  }

  private async getOrThrow(id: string) {
    const video = await this.prisma.creatorDemoVideo.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Demo video not found');
    return video;
  }

  async update(id: string, dto: UpdateDemoVideoDto): Promise<DemoVideoResponseDto> {
    const existing = await this.getOrThrow(id);

    if (dto.videoKey) {
      this.assertKeyOwner(dto.videoKey, 'creator-demo-videos/', 'videoKey');
    }
    if (dto.thumbnailKey) {
      this.assertKeyOwner(
        dto.thumbnailKey,
        'creator-demo-videos/thumbnails/',
        'thumbnailKey',
      );
    }

    const oldVideoKey = dto.videoKey && dto.videoKey !== existing.videoKey
      ? existing.videoKey
      : null;
    const oldThumbnailKey =
      dto.thumbnailKey && dto.thumbnailKey !== existing.thumbnailKey
        ? existing.thumbnailKey
        : null;

    const video = await this.prisma.creatorDemoVideo.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        caption:
          dto.caption !== undefined ? dto.caption.trim() || null : undefined,
        videoKey: dto.videoKey,
        videoUrl: dto.videoKey ? this.storage.buildCdnUrl(dto.videoKey) : undefined,
        thumbnailKey: dto.thumbnailKey,
        thumbnailUrl: dto.thumbnailKey
          ? this.storage.buildCdnUrl(dto.thumbnailKey)
          : undefined,
        sortOrder: dto.sortOrder,
        active: dto.active,
      },
    });

    if (oldVideoKey) {
      await this.storage.deleteObjectIfExists(oldVideoKey).catch((err) =>
        this.logger.warn(`Failed to delete old demo video key ${oldVideoKey}: ${err}`),
      );
    }
    if (oldThumbnailKey) {
      await this.storage.deleteObjectIfExists(oldThumbnailKey).catch((err) =>
        this.logger.warn(
          `Failed to delete old demo video thumbnail key ${oldThumbnailKey}: ${err}`,
        ),
      );
    }

    return toResponseDto(video);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getOrThrow(id);
    await this.prisma.creatorDemoVideo.delete({ where: { id } });

    await this.storage.deleteObjectIfExists(existing.videoKey).catch((err) =>
      this.logger.warn(`Failed to delete demo video key ${existing.videoKey}: ${err}`),
    );
    if (existing.thumbnailKey) {
      await this.storage.deleteObjectIfExists(existing.thumbnailKey).catch((err) =>
        this.logger.warn(
          `Failed to delete demo video thumbnail key ${existing.thumbnailKey}: ${err}`,
        ),
      );
    }
  }
}
