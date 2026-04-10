import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreatorPackageCreateDto } from '../creator-profile/dto/create-creator-profile.dto';

/** Client passed to interactive `$transaction` callbacks */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class CreatorPackageService {
  /**
   * Creates `CreatorPackage` rows and nested `deliverables` JSON arrays.
   * This method is meant to be used inside the caller's Prisma transaction.
   */
  async createPackages(
    tx: PrismaTransactionClient,
    creatorId: string,
    packages: CreatorPackageCreateDto[],
  ) {
    if (packages.length === 0) return;

    await tx.creatorPackage.createMany({
      data: packages.map((pkg) => ({
        creatorId,
        name: pkg.name,
        deliverables: pkg.deliverables,
        priceAmount: new Prisma.Decimal(pkg.priceAmount),
        deliveryDays: pkg.deliveryDays,
        maxRevisions: pkg.maxRevisions,
      })),
    });
  }
}
