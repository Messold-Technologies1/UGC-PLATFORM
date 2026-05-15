import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCreatorRatingReviewDto } from './dto/create-creator-rating-review.dto';
import type { CreateCreatorRatingReviewResponseDto } from './dto/create-creator-rating-review-response.dto';
import type { CreatorRatingReviewDto } from './dto/creator-rating-review.dto';
import type { ListCreatorRatingReviewsQueryDto } from './dto/list-creator-rating-reviews-query.dto';
import type { ListCreatorRatingReviewsResponseDto } from './dto/list-creator-rating-reviews-response.dto';

const reviewInclude = {
  brand: { select: { id: true, brandName: true, logoUrl: true } },
  order: { select: { packageNameSnapshot: true } },
} as const;

function formatAvgRating(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return (Math.round(value * 100) / 100).toFixed(2);
}

function mapReview(row: {
  id: string;
  orderId: string;
  creatorId: string;
  rating: number;
  review: string | null;
  createdAt: Date;
  brand: { id: string; brandName: string; logoUrl: string | null };
  order: { packageNameSnapshot: string };
}): CreatorRatingReviewDto {
  return {
    id: row.id,
    orderId: row.orderId,
    creatorId: row.creatorId,
    rating: row.rating,
    review: row.review ?? null,
    packageNameSnapshot: row.order.packageNameSnapshot,
    brand: {
      id: row.brand.id,
      brandName: row.brand.brandName,
      logoUrl: row.brand.logoUrl ?? null,
    },
    createdAt: row.createdAt,
  };
}

@Injectable()
export class CreatorReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForOrder(params: {
    brandUserId: string;
    orderId: string;
    dto: CreateCreatorRatingReviewDto;
  }): Promise<CreateCreatorRatingReviewResponseDto> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId: params.brandUserId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        brandId: true,
        creatorId: true,
        status: true,
        acceptedAt: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.brandId !== brand.id) {
      throw new ForbiddenException('Not your order');
    }

    const status = String(order.status);
    const reviewableStatuses = new Set([
      'ACCEPTED',
      'CREATOR_PAYMENT_DONE',
      'REJECTED',
    ]);
    if (!reviewableStatuses.has(status)) {
      throw new ConflictException(
        'Order must be completed or rejected before rating the creator',
      );
    }
    if (status !== 'REJECTED' && !order.acceptedAt) {
      throw new ConflictException('Order delivery has not been accepted yet');
    }

    const existing = await this.prisma.creatorRatingReview.findUnique({
      where: { orderId: order.id },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('This order has already been rated');
    }

    const reviewText = params.dto.review?.trim();
    const { row, avgRating, reviewCount } = await this.prisma.$transaction(
      async (tx) => {
        const createdRow = await tx.creatorRatingReview.create({
          data: {
            orderId: order.id,
            brandId: brand.id,
            creatorId: order.creatorId,
            rating: params.dto.rating,
            review: reviewText && reviewText.length > 0 ? reviewText : null,
          },
          include: reviewInclude,
        });

        const agg = await tx.creatorRatingReview.aggregate({
          where: { creatorId: order.creatorId },
          _avg: { rating: true },
          _count: { rating: true },
        });

        const count = agg._count.rating;
        const avgNum = agg._avg.rating;
        const avgRatingDecimal =
          avgNum != null
            ? new Prisma.Decimal(formatAvgRating(avgNum) ?? '0')
            : null;

        await tx.creatorStats.upsert({
          where: { creatorId: order.creatorId },
          create: {
            creatorId: order.creatorId,
            avgRating: avgRatingDecimal,
            reviewCount: count,
          },
          update: {
            avgRating: avgRatingDecimal,
            reviewCount: count,
          },
        });

        return {
          row: createdRow,
          avgRating: formatAvgRating(avgNum),
          reviewCount: count,
        };
      },
    );

    return {
      review: mapReview(row),
      avgRating,
      reviewCount,
    };
  }

  async getForOrder(params: {
    orderId: string;
    viewerUserId: string;
  }): Promise<CreatorRatingReviewDto | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        brand: { select: { userId: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isBrand = order.brand.userId === params.viewerUserId;
    const isCreator = order.creator.userId === params.viewerUserId;
    if (!isBrand && !isCreator) {
      throw new ForbiddenException('Not allowed to view this review');
    }

    const row = await this.prisma.creatorRatingReview.findUnique({
      where: { orderId: params.orderId },
      include: reviewInclude,
    });
    if (!row) return null;
    return mapReview(row);
  }

  async listForCreator(params: {
    creatorId: string;
    query: ListCreatorRatingReviewsQueryDto;
  }): Promise<ListCreatorRatingReviewsResponseDto> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: params.creatorId },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    const page = params.query.page ?? 1;
    const limit = params.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, rows, stats] = await this.prisma.$transaction([
      this.prisma.creatorRatingReview.count({
        where: { creatorId: params.creatorId },
      }),
      this.prisma.creatorRatingReview.findMany({
        where: { creatorId: params.creatorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: reviewInclude,
      }),
      this.prisma.creatorStats.findUnique({
        where: { creatorId: params.creatorId },
        select: { avgRating: true, reviewCount: true },
      }),
    ]);

    return {
      items: rows.map(mapReview),
      total,
      page,
      limit,
      avgRating: stats?.avgRating?.toString() ?? null,
      reviewCount: stats?.reviewCount ?? total,
    };
  }
}
