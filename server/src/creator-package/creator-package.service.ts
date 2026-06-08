import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreatorPackageCreateDto } from '../creator-profile/dto/create-creator-profile.dto';

/** Client passed to interactive `$transaction` callbacks */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class CreatorPackageService {
  private readonly DEFAULT_PACKAGE_NAME = 'Standard';
  private readonly DEFAULT_VIDEO_LENGTH_SECONDS = 60;
  private readonly DEFAULT_DELIVERY_DAYS = 5;
  private readonly DEFAULT_MAX_REVISIONS = 2;
  private readonly MIN_DELIVERY_DAYS = 1;
  private readonly MAX_DELIVERY_DAYS = 30;
  private readonly MAX_VIDEO_LENGTH_SECONDS = 60;
  private readonly PRICE_STEP = 500;

  async createPackages(
    tx: PrismaTransactionClient,
    creatorId: string,
    packages: CreatorPackageCreateDto[],
  ) {
    if (packages.length === 0) return;
    if (packages.length > 1) {
      throw new BadRequestException('Only one package is allowed for now.');
    }

    const pkg = packages[0];
    if (!pkg) return;

    const price = Number(pkg.priceAmount);
    if (!Number.isFinite(price) || !Number.isInteger(price)) {
      throw new BadRequestException('priceAmount must be a whole number.');
    }
    if (price < this.PRICE_STEP || price % this.PRICE_STEP !== 0) {
      throw new BadRequestException(
        `priceAmount must be >= ${this.PRICE_STEP} and in steps of ${this.PRICE_STEP}.`,
      );
    }

    const videoLengthSeconds =
      pkg.videoLengthSeconds ?? this.DEFAULT_VIDEO_LENGTH_SECONDS;
    if (!Number.isInteger(videoLengthSeconds) || videoLengthSeconds < 1) {
      throw new BadRequestException(
        'videoLengthSeconds must be a positive integer.',
      );
    }
    if (videoLengthSeconds > this.MAX_VIDEO_LENGTH_SECONDS) {
      throw new BadRequestException(
        `videoLengthSeconds must be <= ${this.MAX_VIDEO_LENGTH_SECONDS}.`,
      );
    }

    const deliveryDays = pkg.deliveryDays ?? this.DEFAULT_DELIVERY_DAYS;
    if (!Number.isInteger(deliveryDays)) {
      throw new BadRequestException('deliveryDays must be a whole number.');
    }
    if (
      deliveryDays < this.MIN_DELIVERY_DAYS ||
      deliveryDays > this.MAX_DELIVERY_DAYS
    ) {
      throw new BadRequestException(
        `deliveryDays must be between ${this.MIN_DELIVERY_DAYS} and ${this.MAX_DELIVERY_DAYS}.`,
      );
    }

    const maxRevisions = pkg.maxRevisions ?? this.DEFAULT_MAX_REVISIONS;
    if (!Number.isInteger(maxRevisions) || maxRevisions < 1) {
      throw new BadRequestException('maxRevisions must be >= 1.');
    }

    const packageName = pkg.name?.trim() || this.DEFAULT_PACKAGE_NAME;

    const deliverables = pkg.deliverables?.filter(Boolean).map(String) ?? [];
    const normalizedDeliverables = deliverables.length
      ? deliverables
      : ['1 Video'];
    if (
      pkg.basicEditing === true &&
      !normalizedDeliverables.includes('Basic editing')
    ) {
      normalizedDeliverables.push('Basic editing');
    }

    await tx.creatorPackage.create({
      data: {
        creatorId,
        name: packageName,
        deliverables: normalizedDeliverables,
        videoLengthSeconds,
        priceAmount: new Prisma.Decimal(String(price)),
        deliveryDays,
        maxRevisions,
      },
    });
  }
}
