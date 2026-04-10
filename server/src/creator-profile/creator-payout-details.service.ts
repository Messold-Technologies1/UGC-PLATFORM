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

  private validateBankUpiExclusivity(dto: UpsertCreatorPayoutDetailsDto): void {
    const bankFields = [dto.accountHolderName, dto.accountNumber, dto.ifsc].filter(
      (v) => v != null && String(v).trim() !== '',
    );
    const hasAnyBank = bankFields.length > 0;
    const hasFullBank =
      dto.accountHolderName &&
      dto.accountNumber &&
      dto.ifsc &&
      dto.accountHolderName.trim() !== '' &&
      dto.accountNumber.trim() !== '' &&
      dto.ifsc.trim() !== '';
    const upi = dto.upiId?.trim();

    if (hasAnyBank && !hasFullBank) {
      throw new BadRequestException(
        'Bank payout requires accountHolderName, accountNumber, and ifsc together',
      );
    }
    if (!hasFullBank && !upi) {
      throw new BadRequestException('Provide full bank details or a UPI ID');
    }
  }

  async upsertForCurrentCreator(
    userId: string,
    dto: UpsertCreatorPayoutDetailsDto,
  ): Promise<CreatorPayoutDetailsMaskedDto> {
    this.validateBankUpiExclusivity(dto);

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }

    const name = dto.accountHolderName;
    const num = dto.accountNumber;
    const ifscCode = dto.ifsc;
    let bankHolder: string | null = null;
    let bankNumber: string | null = null;
    let bankIfsc: string | null = null;
    if (
      name &&
      num &&
      ifscCode &&
      name.trim() !== '' &&
      num.trim() !== '' &&
      ifscCode.trim() !== ''
    ) {
      bankHolder = name.trim();
      bankNumber = num.trim();
      bankIfsc = ifscCode.trim().toUpperCase();
    }
    const upiTrim = dto.upiId?.trim() || null;

    await this.prisma.creatorPayoutDetails.upsert({
      where: { creatorId: profile.id },
      create: {
        creatorId: profile.id,
        accountHolderName: bankHolder,
        accountNumber: bankNumber,
        ifsc: bankIfsc,
        upiId: upiTrim,
      },
      update: {
        accountHolderName: bankHolder,
        accountNumber: bankNumber,
        ifsc: bankIfsc,
        upiId: upiTrim,
      },
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
