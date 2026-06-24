import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LegalDraftStatus } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  LegalPageResponseDto,
  LegalSectionResponseDto,
  AdminLegalPageListResponseDto,
  AdminLegalPageDetailResponseDto,
  LegalPageDraftResponseDto,
  LegalPageVersionListResponseDto,
  LegalPageVersionDetailResponseDto,
} from './dto';
import type { SaveDraftDto, DraftSectionInputDto } from './dto/save-draft.dto';

import type { RejectDraftDto } from './dto/reject-draft.dto';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'h3',
    'h4',
    'strong',
    'em',
    'a',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'div',
    'span',
    'br',
    'blockquote',
    'sub',
    'sup',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class'],
    div: ['class'],
    span: ['class'],
    p: ['class'],
    h3: ['class'],
    h4: ['class'],
    th: ['class'],
    td: ['class'],
    table: ['class'],
    ul: ['class'],
    ol: ['class'],
    li: ['class'],
    strong: ['class'],
    em: ['class'],
    blockquote: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer',
    }),
  },
};

interface DraftSectionSnapshot {
  anchorId: string;
  title: string;
  tocLabel: string;
  content: string;
  sortOrder: number;
}

interface PageSnapshot {
  title: string;
  description: string;
  effectiveDate: string;
  sections: DraftSectionSnapshot[];
}

@Injectable()
export class LegalPagesService {
  private readonly logger = new Logger(LegalPagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPageBySlug(slug: string): Promise<LegalPageResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      description: page.description,
      effectiveDate: page.effectiveDate,
      updatedAt: page.updatedAt,
      sections: (page.sections as unknown as DraftSectionSnapshot[]).map((s) =>
        this.mapSection(s),
      ),
    };
  }

  async getAllPages(): Promise<AdminLegalPageListResponseDto> {
    const pages = await this.prisma.legalPage.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        effectiveDate: true,
        updatedAt: true,
        sections: true,
        draftStatus: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      pages: pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        effectiveDate: p.effectiveDate,
        sectionCount: Array.isArray(p.sections) ? p.sections.length : 0,
        updatedAt: p.updatedAt,
        draftStatus: p.draftStatus,
      })),
    };
  }

  async getPageForAdmin(
    slug: string,
  ): Promise<AdminLegalPageDetailResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      description: page.description,
      effectiveDate: page.effectiveDate,
      updatedAt: page.updatedAt,
      sections: (page.sections as unknown as DraftSectionSnapshot[]).map((s) =>
        this.mapSection(s),
      ),
      draft: page.draftStatus ? this.mapDraft(page) : null,
    };
  }

  async saveDraft(
    slug: string,
    dto: SaveDraftDto,
    adminUserId: string,
  ): Promise<LegalPageDraftResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
      select: { id: true, draftStatus: true },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    if (page.draftStatus === LegalDraftStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Cannot edit a draft that is currently in review. Reject it first to continue editing.',
      );
    }

    this.validateUniqueSectionAnchors(dto.sections);

    const sanitizedSections = this.sanitizeSections(dto.sections);

    const draft = await this.prisma.legalPage.update({
      where: { id: page.id },
      data: {
        draftTitle: dto.title,
        draftDescription: dto.description,
        draftEffectiveDate: dto.effectiveDate,
        draftSections: sanitizedSections as unknown as Prisma.InputJsonValue,
        draftChangeNote: dto.changeNote ?? null,
        draftStatus: LegalDraftStatus.DRAFT,
        draftReviewNote: null,
        ...(page.draftStatus
          ? {}
          : { draftCreatedBy: adminUserId, draftCreatedAt: new Date() }),
        draftUpdatedAt: new Date(),
      },
    });

    this.logger.log(`Draft saved for "${slug}" by admin ${adminUserId}`);

    return this.mapDraft(draft);
  }

  async submitForReview(
    slug: string,
    adminUserId: string,
  ): Promise<LegalPageDraftResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
      select: { id: true, draftStatus: true },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    if (!page.draftStatus) {
      throw new BadRequestException('No draft exists for this page');
    }

    if (page.draftStatus !== LegalDraftStatus.DRAFT) {
      throw new BadRequestException(
        `Draft is already in "${page.draftStatus}" status`,
      );
    }

    const draft = await this.prisma.legalPage.update({
      where: { id: page.id },
      data: {
        draftStatus: LegalDraftStatus.IN_REVIEW,
        draftReviewNote: null,
        draftUpdatedAt: new Date(),
      },
    });

    this.logger.log(
      `Draft for "${slug}" submitted for review by admin ${adminUserId}`,
    );

    return this.mapDraft(draft);
  }

  async publishDraft(
    slug: string,
    adminUserId: string,
  ): Promise<AdminLegalPageDetailResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    if (!page.draftStatus) {
      throw new BadRequestException('No draft exists for this page');
    }

    if (page.draftStatus !== LegalDraftStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Draft must be in "IN_REVIEW" status to publish. Submit it for review first.',
      );
    }

    const draftSections =
      page.draftSections as unknown as DraftSectionSnapshot[];

    const liveSnapshot: PageSnapshot = {
      title: page.title,
      description: page.description,
      effectiveDate: page.effectiveDate,
      sections: page.sections as unknown as DraftSectionSnapshot[],
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      if (Array.isArray(page.sections) && page.sections.length > 0) {
        await tx.legalPageVersion.create({
          data: {
            pageId: page.id,
            snapshot: liveSnapshot as any,
            changedBy: adminUserId,
            changeNote: page.draftChangeNote,
          },
        });
      }

      return tx.legalPage.update({
        where: { id: page.id },
        data: {
          title: page.draftTitle!,
          description: page.draftDescription!,
          effectiveDate: page.draftEffectiveDate!,
          sections: draftSections as unknown as Prisma.InputJsonValue,
          updatedBy: adminUserId,

          draftStatus: null,
          draftTitle: null,
          draftDescription: null,
          draftEffectiveDate: null,
          draftSections: Prisma.DbNull,
          draftChangeNote: null,
          draftCreatedBy: null,
          draftReviewNote: null,
          draftCreatedAt: null,
          draftUpdatedAt: null,
        },
      });
    });

    this.logger.log(`Draft for "${slug}" published by admin ${adminUserId}`);

    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      description: updated.description,
      effectiveDate: updated.effectiveDate,
      updatedAt: updated.updatedAt,
      sections: (updated.sections as unknown as DraftSectionSnapshot[]).map(
        (s) => this.mapSection(s),
      ),
      draft: null,
    };
  }

  async rejectDraft(
    slug: string,
    dto: RejectDraftDto,
    adminUserId: string,
  ): Promise<LegalPageDraftResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
      select: { id: true, draftStatus: true },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    if (!page.draftStatus) {
      throw new BadRequestException('No draft exists for this page');
    }

    if (page.draftStatus !== LegalDraftStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Can only reject a draft that is in "IN_REVIEW" status',
      );
    }

    const draft = await this.prisma.legalPage.update({
      where: { id: page.id },
      data: {
        draftStatus: LegalDraftStatus.DRAFT,
        draftReviewNote: dto.reviewNote ?? null,
        draftUpdatedAt: new Date(),
      },
    });

    this.logger.log(`Draft for "${slug}" rejected by admin ${adminUserId}`);

    return this.mapDraft(draft);
  }

  async discardDraft(slug: string, adminUserId: string): Promise<void> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
      select: { id: true, draftStatus: true },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    if (!page.draftStatus) {
      throw new BadRequestException('No draft exists for this page');
    }

    await this.prisma.legalPage.update({
      where: { id: page.id },
      data: {
        draftStatus: null,
        draftTitle: null,
        draftDescription: null,
        draftEffectiveDate: null,
        draftSections: Prisma.DbNull,
        draftChangeNote: null,
        draftCreatedBy: null,
        draftReviewNote: null,
        draftCreatedAt: null,
        draftUpdatedAt: null,
      },
    });

    this.logger.log(`Draft for "${slug}" discarded by admin ${adminUserId}`);
  }

  async getDraftPreview(slug: string): Promise<LegalPageResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        draftStatus: true,
        draftTitle: true,
        draftDescription: true,
        draftEffectiveDate: true,
        draftUpdatedAt: true,
        draftSections: true,
      },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    if (!page.draftStatus) {
      throw new BadRequestException('No draft exists to preview');
    }

    const draftSections =
      page.draftSections as unknown as DraftSectionSnapshot[];

    return {
      id: page.id,
      slug: page.slug,
      title: page.draftTitle!,
      description: page.draftDescription!,
      effectiveDate: page.draftEffectiveDate!,
      updatedAt: page.draftUpdatedAt || new Date(),
      sections: draftSections.map((s, index) => ({
        id: `preview-${index}`,
        anchorId: s.anchorId,
        title: s.title,
        tocLabel: s.tocLabel,
        content: s.content,
        sortOrder: s.sortOrder,
      })),
    };
  }

  async getVersionHistory(
    slug: string,
  ): Promise<LegalPageVersionListResponseDto> {
    const page = await this.prisma.legalPage.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!page) {
      throw new NotFoundException(`Legal page "${slug}" not found`);
    }

    const versions = await this.prisma.legalPageVersion.findMany({
      where: { pageId: page.id },
      select: {
        id: true,
        changedBy: true,
        changeNote: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { versions };
  }

  async getVersion(
    versionId: string,
  ): Promise<LegalPageVersionDetailResponseDto> {
    const version = await this.prisma.legalPageVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Version "${versionId}" not found`);
    }

    return {
      id: version.id,
      pageId: version.pageId,
      snapshot: version.snapshot as Record<string, unknown>,
      changedBy: version.changedBy,
      changeNote: version.changeNote,
      createdAt: version.createdAt,
    };
  }

  private mapSection(
    section: Omit<DraftSectionSnapshot, 'id'>,
  ): LegalSectionResponseDto {
    return {
      id: crypto.randomUUID(),
      anchorId: section.anchorId,
      title: section.title,
      tocLabel: section.tocLabel,
      content: section.content,
      sortOrder: section.sortOrder,
    };
  }

  private mapDraft(page: {
    id: string;
    draftStatus?: LegalDraftStatus | null;
    draftTitle?: string | null;
    draftDescription?: string | null;
    draftEffectiveDate?: string | null;
    draftSections?: any;
    draftChangeNote?: string | null;
    draftCreatedBy?: string | null;
    draftReviewNote?: string | null;
    draftCreatedAt?: Date | null;
    draftUpdatedAt?: Date | null;
  }): LegalPageDraftResponseDto {
    return {
      id: page.id,
      status: page.draftStatus!,
      title: page.draftTitle!,
      description: page.draftDescription!,
      effectiveDate: page.draftEffectiveDate!,
      sections: page.draftSections as DraftSectionSnapshot[],
      changeNote: page.draftChangeNote || null,
      createdBy: page.draftCreatedBy!,
      reviewNote: page.draftReviewNote || null,
      createdAt: page.draftCreatedAt || new Date(),
      updatedAt: page.draftUpdatedAt || new Date(),
    };
  }

  private sanitizeSections(
    sections: DraftSectionInputDto[],
  ): DraftSectionSnapshot[] {
    return sections.map((s) => ({
      anchorId: s.anchorId,
      title: s.title.trim(),
      tocLabel: s.tocLabel.trim(),
      content: sanitizeHtml(s.content, SANITIZE_OPTIONS),
      sortOrder: s.sortOrder,
    }));
  }
  private validateUniqueSectionAnchors(sections: DraftSectionInputDto[]): void {
    const anchors = sections.map((s) => s.anchorId);
    const duplicates = anchors.filter((a, i) => anchors.indexOf(a) !== i);
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate section anchorIds: ${[...new Set(duplicates)].join(', ')}`,
      );
    }
  }
}
