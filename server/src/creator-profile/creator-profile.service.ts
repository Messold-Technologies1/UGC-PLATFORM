import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreatorProfileDto } from './dto/create-creator-profile.dto';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';

@Injectable()
export class CreatorProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorPackageService: CreatorPackageService,
  ) {}

  private mapCreatorProfile(profile: any) {
    return {
      ...profile,
      packages: (profile.packages ?? []).map((p: any) => ({
        ...p,
        priceAmount: p.priceAmount?.toString?.() ?? p.priceAmount,
      })),
    };
  }

  private async isAdmin(userId: string, tx: any): Promise<boolean> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) return false;
    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    return (
      user.userRoles?.some((ur: any) => ur.role?.name === RoleName.ADMIN) ??
      false
    );
  }

  private async resolveServiceTypes(
    serviceTypeNamesUnique: string[],
  ): Promise<Array<{ id: string; name: string }>> {
    if (serviceTypeNamesUnique.length === 0) return [];

    const existing = await this.prisma.serviceType.findMany({
      where: { name: { in: serviceTypeNamesUnique } },
      select: { id: true, name: true },
    });

    const found = new Set(existing.map((s) => s.name));
    const missing = serviceTypeNamesUnique.filter((n) => !found.has(n));

    if (missing.length > 0) {
      // Allow "free-form" service types by auto-creating missing `ServiceType.name` values.
      await this.prisma.serviceType.createMany({
        data: missing.map((name) => ({ name })),
        skipDuplicates: true,
      });

      return this.prisma.serviceType.findMany({
        where: { name: { in: serviceTypeNamesUnique } },
        select: { id: true, name: true },
      });
    }

    return existing;
  }

  async createCreatorProfile(userId: string, dto: CreateCreatorProfileDto) {
    const normalizedLanguages = (dto.languages ?? [])
      .map((l) => l.trim())
      .filter(Boolean);
    const normalizedServiceTypeNamesUnique = [...new Set((dto.serviceTypeNames ?? []).map((n) => n.trim()).filter(Boolean))];

    // Resolve service types OUTSIDE the transaction to keep it short.
    const resolvedServiceTypes = await this.resolveServiceTypes(
      normalizedServiceTypeNamesUnique,
    );

    const creatorProfileId = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.creatorProfile.findUnique({
          where: { userId },
        });
        if (existing) {
          throw new ConflictException('Creator profile already exists');
        }

        const creatorProfile = await tx.creatorProfile.create({
          data: {
            userId,
            displayName: dto.displayName,
            city: dto.city ?? null,
            bio: dto.bio ?? null,
            gender: dto.gender ?? null,
            ageRange: dto.ageRange ?? null,
            travelRadius: dto.travelRadius ?? null,
          },
        });

        // Independent writes: can be done in parallel once we have creatorProfile.id.
        const ops: Array<Promise<unknown>> = [];

        if (normalizedLanguages.length > 0) {
          ops.push(
            tx.creatorLanguage.createMany({
              data: normalizedLanguages.map((language) => ({
                creatorId: creatorProfile.id,
                language,
              })),
              skipDuplicates: true,
            }),
          );
        }

        if (resolvedServiceTypes.length > 0) {
          ops.push(
            tx.creatorService.createMany({
              data: resolvedServiceTypes.map((serviceType) => ({
                creatorId: creatorProfile.id,
                serviceTypeId: serviceType.id,
              })),
              skipDuplicates: true,
            }),
          );
        }

        if (dto.packages?.length) {
          ops.push(
            this.creatorPackageService.createPackages(
              tx,
              creatorProfile.id,
              dto.packages,
            ),
          );
        }

        await Promise.all(ops);

        // Strict consistency: role update stays in the same transaction.
        const creatorRole = await tx.role.findUnique({
          where: { name: RoleName.CREATOR },
        });
        if (!creatorRole) {
          throw new Error('Missing Role: CREATOR');
        }

        await tx.user.update({
          where: { id: userId },
          data: { primaryRoleId: creatorRole.id },
        });

        await tx.userRole.upsert({
          where: { userId_roleId: { userId, roleId: creatorRole.id } },
          create: { userId, roleId: creatorRole.id },
          update: { roleId: creatorRole.id },
        });

        return creatorProfile.id;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    // Fetch after commit to keep the transaction fast and avoid interactive tx timeouts.
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: {
        languages: true,
        services: { include: { serviceType: true } },
        packages: true,
      },
    });

    if (!profile) {
      throw new Error('Creator profile creation failed');
    }

    return this.mapCreatorProfile(profile);
  }

  async listCreators(query: ListCreatorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creatorProfile.count(),
      this.prisma.creatorProfile.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          languages: true,
          services: { include: { serviceType: true } },
          packages: true,
        },
      }),
    ]);

    return {
      items: items.map((p) => this.mapCreatorProfile(p)),
      total,
      page,
      limit,
    };
  }

  async getCreatorById(id: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        languages: true,
        services: { include: { serviceType: true } },
        packages: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    return this.mapCreatorProfile(profile);
  }

  async updateCreatorProfile(
    actingUserId: string,
    creatorProfileId: string,
    dto: UpdateCreatorProfileDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
      const profile = await tx.creatorProfile.findUnique({
        where: { id: creatorProfileId },
      });

      if (!profile) {
        throw new NotFoundException('Creator not found');
      }

      const allowed =
        profile.userId === actingUserId ||
        (await this.isAdmin(actingUserId, tx));
      if (!allowed) {
        throw new ForbiddenException(
          'Not allowed to update this creator profile',
        );
      }

      await tx.creatorProfile.update({
        where: { id: creatorProfileId },
        data: {
          displayName: dto.displayName ?? undefined,
          city: dto.city ?? undefined,
          bio: dto.bio ?? undefined,
          gender: dto.gender ?? undefined,
          ageRange: dto.ageRange ?? undefined,
          travelRadius: dto.travelRadius ?? undefined,
        },
      });

      if (dto.languages) {
        const normalized = dto.languages.map((l) => l.trim()).filter(Boolean);
        await tx.creatorLanguage.deleteMany({
          where: { creatorId: creatorProfileId },
        });
        if (normalized.length > 0) {
          await tx.creatorLanguage.createMany({
            data: normalized.map((language) => ({
              creatorId: creatorProfileId,
              language,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (dto.serviceTypeNames) {
        const names = dto.serviceTypeNames.map((n) => n.trim()).filter(Boolean);
        const uniqueNames = [...new Set(names)];

        let serviceTypes = await tx.serviceType.findMany({
          where: { name: { in: uniqueNames } },
          select: { id: true, name: true },
        });
        const found = new Set(serviceTypes.map((s) => s.name));
        const missing = uniqueNames.filter((n) => !found.has(n));

        if (missing.length > 0) {
          // Allow "free-form" service types by auto-creating missing `ServiceType.name` values.
          await tx.serviceType.createMany({
            data: missing.map((name) => ({ name })),
            skipDuplicates: true,
          });
          serviceTypes = await tx.serviceType.findMany({
            where: { name: { in: uniqueNames } },
            select: { id: true, name: true },
          });
        }

        await tx.creatorService.deleteMany({
          where: { creatorId: creatorProfileId },
        });
        if (serviceTypes.length > 0) {
          await tx.creatorService.createMany({
            data: serviceTypes.map((st) => ({
              creatorId: creatorProfileId,
              serviceTypeId: st.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (dto.packages) {
        await tx.creatorPackage.deleteMany({
          where: { creatorId: creatorProfileId },
        });
        await this.creatorPackageService.createPackages(
          tx,
          creatorProfileId,
          dto.packages,
        );
      }

      const updated = await tx.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        include: {
          languages: true,
          services: { include: { serviceType: true } },
          packages: true,
        },
      });

      if (!updated) {
        throw new Error('Creator profile update failed');
      }

      return this.mapCreatorProfile(updated);
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async deleteCreatorProfile(actingUserId: string, creatorProfileId: string) {
    await this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
        });
        if (!profile) {
          throw new NotFoundException('Creator not found');
        }

        const allowed =
          profile.userId === actingUserId ||
          (await this.isAdmin(actingUserId, tx));
        if (!allowed) {
          throw new ForbiddenException(
            'Not allowed to delete this creator profile',
          );
        }

        await tx.creatorProfile.delete({ where: { id: creatorProfileId } });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }
}
