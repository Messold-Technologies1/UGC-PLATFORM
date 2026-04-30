import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertCreatorPayoutDetailsDto } from './dto/upsert-creator-payout-details.dto';
import type { CreatorPayoutDetailsMaskedDto } from './dto/creator-payout-details-masked.dto';
import type { AdminCreatorPayoutDetailsDto } from './dto/admin-creator-payout-details.dto';

function maskUpi(vpa: string): string {
  const [name, domain] = vpa.split('@');
  if (!name || !domain) return '***';
  return `${name.slice(0, 2)}***@${domain}`;
}

@Injectable()
export class CreatorPayoutDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  private validatePayoutUpdate(params: {
    dto: UpsertCreatorPayoutDetailsDto;
    hasExistingRow: boolean;
  }): {
    bankKeysPresent: boolean;
    upiKeyPresent: boolean;
    hasFullBank: boolean;
  } {
    const { dto, hasExistingRow } = params;
 
    const bankKeysPresent =
      dto.accountHolderName !== undefined ||
      dto.accountNumber !== undefined ||
      dto.ifsc !== undefined;
    const upiKeyPresent = dto.upiId !== undefined;

    const hasFullBank =
      !!dto.accountHolderName &&
      !!dto.accountNumber &&
      !!dto.ifsc &&
      dto.accountHolderName.trim() !== '' &&
      dto.accountNumber.trim() !== '' &&
      dto.ifsc.trim() !== '';

    if (bankKeysPresent && !hasFullBank) {
      throw new BadRequestException(
        'Bank payout requires accountHolderName, accountNumber, and ifsc together',
      );
    }

    if (!hasExistingRow) {
      const upi = dto.upiId?.trim();
      if (!hasFullBank && !upi) {
        throw new BadRequestException('Provide full bank details or a UPI ID');
      }
    }

    return { bankKeysPresent, upiKeyPresent, hasFullBank };
  }

  async upsertForCurrentCreator(
    userId: string,
    dto: UpsertCreatorPayoutDetailsDto,
  ): Promise<CreatorPayoutDetailsMaskedDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }

    const existing = await this.prisma.creatorPayoutDetails.findUnique({
      where: { creatorId: profile.id },
      select: { creatorId: true },
    });
    const { bankKeysPresent, upiKeyPresent, hasFullBank } =
      this.validatePayoutUpdate({
        dto,
        hasExistingRow: !!existing,
      });

    const name = dto.accountHolderName;
    const num = dto.accountNumber;
    const ifscCode = dto.ifsc;
    let bankHolder: string | null = null;
    let bankNumber: string | null = null;
    let bankIfsc: string | null = null;
    if (hasFullBank && name && num && ifscCode) {
      bankHolder = name.trim();
      bankNumber = num.trim();
      bankIfsc = ifscCode.trim().toUpperCase();
    }

    const updateData: Record<string, unknown> = {};
    if (bankKeysPresent) {
      updateData.accountHolderName = bankHolder;
      updateData.accountNumber = bankNumber;
      updateData.ifsc = bankIfsc;
    }
    if (upiKeyPresent) {
      updateData.upiId = dto.upiId?.trim() || null;
    }

    await this.prisma.creatorPayoutDetails.upsert({
      where: { creatorId: profile.id },
      create: {
        creatorId: profile.id,
        accountHolderName: bankHolder,
        accountNumber: bankNumber,
        ifsc: bankIfsc,
        upiId: dto.upiId?.trim() || null,
      },
      update: updateData as any,
    });

    return this.getMaskedForCurrentCreator(userId);
  }

  async getMaskedForCurrentCreator(userId: string): Promise<CreatorPayoutDetailsMaskedDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }

    const row = await this.prisma.creatorPayoutDetails.findUnique({
      where: { creatorId: profile.id },
    });

    if (!row) {
      return { configured: false };
    }

    const acct = row.accountNumber;
    const ifscVal = row.ifsc;
    const hasBank = !!(acct && ifscVal);
    const upiVal = row.upiId;
    const hasUpi = !!upiVal;

    return {
      configured: true,
      hasBankDetails: hasBank,
      accountNumberLast4: hasBank && acct ? acct.slice(-4) : undefined,
      ifsc: hasBank && ifscVal ? ifscVal : undefined,
      accountHolderName: hasBank ? row.accountHolderName ?? undefined : undefined,
      hasUpi,
      upiMasked: hasUpi && upiVal ? maskUpi(upiVal) : undefined,
    };
  }

  async getFullForAdmin(creatorProfileId: string): Promise<AdminCreatorPayoutDetailsDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }

    const row = await this.prisma.creatorPayoutDetails.findUnique({
      where: { creatorId: creatorProfileId },
    });

    if (!row) {
      return {
        accountHolderName: null,
        accountNumber: null,
        ifsc: null,
        upiId: null,
      };
    }

    return {
      accountHolderName: row.accountHolderName,
      accountNumber: row.accountNumber,
      ifsc: row.ifsc,
      upiId: row.upiId,
    };
  }
}
