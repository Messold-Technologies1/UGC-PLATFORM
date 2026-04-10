# Implementation Plan: Admin Brand List and Permanent Brand Access Revocation Flow

## Goal

Implement admin-side brand management with the following behavior:

1. The admin brand list should show all **users** who currently have effective `BRAND` role access.
2. Removing a brand from that list should **not delete the user account**.
3. Removing a brand should:
   - remove the user's `BRAND` role linkage
   - clear their active `BRAND` workspace session
   - remove their `BrandProfile`
   - optionally clean up brand logo storage
   - if the user also has `CREATOR`, shift their fallback to `CREATOR`
   - otherwise leave them with no brand access and no workspace fallback
   - mark brand access as permanently revoked
4. After removal, that user must be blocked permanently from creating a new brand profile again.

---

## Core Behavior Decision

This implementation should **permanently revoke brand access after admin removal**.

That means:

- we **will** add revocation fields in the database
- we **will** block `POST /auth/workspace` from re-adding `BRAND`
- we **will** block `POST /brands/profile` for revoked users
- we **will not** add an admin restore API

Final role rule for this flow:

1. A user can have `CREATOR`, `BRAND`, or both.
2. If the user has both and `BRAND` is removed, the fallback becomes `CREATOR`.
3. If the user only has `BRAND`, removing brand leaves them with no brand access and no fallback role.
4. Brand removal is permanent from the application flow perspective.

This matches your final requirement exactly.

---

## 1. Add Revocation Fields to Prisma

#### [MODIFY] `schema.prisma`
Path: `server/prisma/schema.prisma`

Add revocation metadata to the `User` model so admin removal is durable.

```prisma
model User {
  id                          String     @id @default(uuid()) @db.Uuid
  email                       String     @unique
  name                        String?
  passwordHash                String?
  phone                       String?
  emailVerified               Boolean    @default(false)
  phoneVerified               Boolean    @default(false)
  status                      UserStatus @default(ACTIVE)
  deletedAt                   DateTime?
  createdAt                   DateTime   @default(now())
  updatedAt                   DateTime   @updatedAt
  primaryRoleId               String?    @db.Uuid

  brandAccessRevokedAt        DateTime?
  brandAccessRevokedById      String?    @db.Uuid
  brandAccessRevocationReason String?

  primaryRole                 Role?             @relation("PrimaryUserRole", fields: [primaryRoleId], references: [id], onDelete: SetNull)
  authAccounts                AuthAccount[]
  sessions                    Session[]
  userRoles                   UserRole[]
  creatorProfile              CreatorProfile?
  brandProfile                BrandProfile?
  approvedCreatorRecords      CreatorApproval[] @relation("CreatorApprovedBy")
  featuredCreatorRecords      CreatorFeature[]  @relation("CreatorFeaturedBy")
  auditLogs                   AuditLog[]        @relation("AuditLogActor")

  @@index([status])
  @@index([deletedAt])
  @@index([primaryRoleId])
  @@index([brandAccessRevokedAt])
}
```

After this, generate and apply a Prisma migration.

---

## 2. Keep the List Query DTO

#### [KEEP] `list-brands-query.dto.ts`
Path: `server/src/brand-profile/dto/list-brands-query.dto.ts`

This file already exists and is suitable for paginated admin brand listing.

No structural change needed unless later you want search/filter support.

---

## 3. Replace the Admin List Response Shape

The current admin brand list should not rely on `BrandProfileResponseDto` with fake IDs.

The admin list is fundamentally a **user-based** listing, not a pure `BrandProfile` listing.

#### [NEW] `admin-brand-list-item.dto.ts`
Path: `server/src/brand-profile/dto/admin-brand-list-item.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminBrandListItemDto {
  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiPropertyOptional({ example: 'brand-profile-uuid', nullable: true })
  brandProfileId!: string | null;

  @ApiProperty({ example: 'brand@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Acme Team', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'Acme Inc.', nullable: true })
  companyName!: string | null;

  @ApiPropertyOptional({ example: 'Skincare', nullable: true })
  industry!: string | null;

  @ApiPropertyOptional({ example: 'Jane (Marketing Lead)', nullable: true })
  contactPerson!: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/brand-logo/logo.png', nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
```

#### [MODIFY] `brands-list-response.dto.ts`
Path: `server/src/brand-profile/dto/brands-list-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AdminBrandListItemDto } from './admin-brand-list-item.dto';

export class BrandsListResponseDto {
  @ApiProperty({ type: () => [AdminBrandListItemDto] })
  items!: AdminBrandListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
```

---

## 4. Add Optional Delete Request DTO

If the admin UI may send a reason, keep a DTO for extensibility.

#### [NEW] `remove-brand-role.dto.ts`
Path: `server/src/brand-profile/dto/remove-brand-role.dto.ts`

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RemoveBrandRoleDto {
  @ApiPropertyOptional({ example: 'Removed from admin brand management' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
```

Reason is optional but recommended since revocation is permanent.

---

## 5. Add Storage Cleanup Helper

If a brand profile has a logo stored in S3, deleting the profile should ideally also remove the object.

#### [MODIFY] `storage.service.ts`
Path: `server/src/storage/storage.service.ts`

Add:

```typescript
  async deleteObjectIfExists(key: string | null | undefined): Promise<void> {
    if (!key) return;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
```

This cleanup should happen **after** the database transaction commits, so storage failure does not break brand removal.

---

## 6. Update BrandProfileService

#### [MODIFY] `brand-profile.service.ts`
Path: `server/src/brand-profile/brand-profile.service.ts`

### Add imports

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import { BrandsListResponseDto } from './dto/brands-list-response.dto';
import { RemoveBrandRoleDto } from './dto/remove-brand-role.dto';
```

---

### 6A. Add `listBrands(...)`

This should query the `User` table, not just `BrandProfile`.

Why:
- brand membership is role-driven
- admin list should represent users who currently act as brands
- revoked users should no longer appear in the active admin brand list

```typescript
  async listBrands(query: ListBrandsQueryDto): Promise<BrandsListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      brandAccessRevokedAt: null,
      OR: [
        { primaryRole: { name: RoleName.BRAND } },
        { userRoles: { some: { role: { name: RoleName.BRAND } } } },
      ],
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          brandProfile: true,
        },
      }),
    ]);

    return {
      items: users.map((user) => ({
        userId: user.id,
        brandProfileId: user.brandProfile?.id ?? null,
        email: user.email,
        name: user.name ?? null,
        companyName: user.brandProfile?.companyName ?? null,
        industry: user.brandProfile?.industry ?? null,
        contactPerson: user.brandProfile?.contactPerson ?? null,
        logoUrl: user.brandProfile?.logoUrl ?? null,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }
```

---

### 6B. Add `removeBrandAccessFromUser(...)`

This method should:

- verify the target user exists
- remove `BRAND` from `UserRole`
- if the user also has `CREATOR`, switch fallback to `CREATOR`
- otherwise use `null` fallback
- clear `primaryRoleId` if it points to `BRAND`
- clear any `Session.activeRoleId` using `BRAND`
- delete `BrandProfile`
- mark brand access as revoked
- keep the base `User` record intact

```typescript
  async removeBrandAccessFromUser(
    adminUserId: string,
    userId: string,
    dto?: RemoveBrandRoleDto,
  ): Promise<void> {
    let logoKeyToDelete: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      const brandRole = await tx.role.findUnique({
        where: { name: RoleName.BRAND },
        select: { id: true },
      });

      const creatorRole = await tx.role.findUnique({
        where: { name: RoleName.CREATOR },
        select: { id: true },
      });

      if (!brandRole) {
        throw new NotFoundException('BRAND role not configured');
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          brandProfile: true,
          userRoles: true,
        },
      });

      if (!user || user.deletedAt) {
        throw new NotFoundException('User not found');
      }

      const hasBrandPrimaryRole = user.primaryRoleId === brandRole.id;
      const hasBrandUserRole = user.userRoles.some((ur) => ur.roleId === brandRole.id);
      const hasBrandProfile = !!user.brandProfile;

      if (!hasBrandPrimaryRole && !hasBrandUserRole && !hasBrandProfile) {
        throw new BadRequestException('User does not currently have brand access');
      }

      const hasCreatorRole = !!creatorRole &&
        user.userRoles.some((ur) => ur.roleId === creatorRole.id);

      const fallbackRoleId = hasCreatorRole ? creatorRole!.id : null;

      await tx.userRole.deleteMany({
        where: {
          userId,
          roleId: brandRole.id,
        },
      });

      if (hasBrandPrimaryRole) {
        await tx.user.update({
          where: { id: userId },
          data: {
            primaryRoleId: fallbackRoleId,
          },
        });
      }

      await tx.session.updateMany({
        where: {
          userId,
          activeRoleId: brandRole.id,
        },
        data: {
          activeRoleId: fallbackRoleId,
        },
      });

      if (user.brandProfile) {
        logoKeyToDelete = user.brandProfile.logoKey ?? null;

        await tx.brandProfile.delete({
          where: { userId },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          brandAccessRevokedAt: new Date(),
          brandAccessRevokedById: adminUserId,
          brandAccessRevocationReason: dto?.reason?.trim() || null,
        },
      });
    }, { timeout: 30_000, maxWait: 10_000 });

    if (logoKeyToDelete) {
      try {
        await this.storage.deleteObjectIfExists(logoKeyToDelete);
      } catch {
        // Optional: add logger later
      }
    }
  }
```

Fallback behavior is now final:

1. if the user still has `CREATOR`, fallback becomes `CREATOR`
2. otherwise fallback becomes `null`

---

### 6C. Block revoked users from creating brand profiles

#### [MODIFY] `brand-profile.service.ts`
Path: `server/src/brand-profile/brand-profile.service.ts`

Add a revocation check at the start of `createBrandProfile(...)`.

```typescript
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletedAt: true,
        brandAccessRevokedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (user.brandAccessRevokedAt) {
      throw new ForbiddenException(
        'Brand profile creation has been disabled for this account',
      );
    }
```

This prevents direct profile recreation even if someone bypasses the normal workspace UI.

---

### 6D. Keep brand profile response mapping consistent

#### [MODIFY] `brand-profile.service.ts`
Path: `server/src/brand-profile/brand-profile.service.ts`

The current service mapping expects either `profile.user.email` or `profile.email`. While updating this module, ensure all code paths returning `BrandProfileResponseDto` load email consistently.

Recommended implementation:

```typescript
  async getBrandProfileForCurrentUser(
    userId: string,
  ): Promise<BrandProfileResponseDto> {
    const profile = await this.prisma.brandProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        companyName: true,
        logoKey: true,
        logoUrl: true,
        website: true,
        industry: true,
        contactPerson: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true } },
      } as any,
    });

    if (!profile) {
      throw new NotFoundException('Brand profile not found');
    }

    return this.mapBrandProfile(profile);
  }
```

This keeps DTO responses stable while you are already touching the brand service.

---

## 7. Restrict `POST /auth/workspace` for revoked brand users

#### [MODIFY] `auth.service.ts`
Path: `server/src/auth/auth.service.ts`

Add a check in `selectWorkspace(...)` before the `userRole.upsert(...)`.

```typescript
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        brandAccessRevokedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Account could not be loaded');
    }

    if (role === 'BRAND' && user.brandAccessRevokedAt) {
      throw new ForbiddenException(
        'Brand workspace access has been removed by an admin',
      );
    }
```

### Import to add

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
```

This ensures the user cannot self-readd the `BRAND` role after admin removal.

---

## 8. Create the Admin Brand Controller

#### [NEW] `admin-brand.controller.ts`
Path: `server/src/brand-profile/admin-brand.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BrandProfileService } from './brand-profile.service';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import { BrandsListResponseDto } from './dto/brands-list-response.dto';
import { RemoveBrandRoleDto } from './dto/remove-brand-role.dto';

@ApiTags('Admin - Brands')
@ApiBearerAuth()
@Controller('admin/brands')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBrandController {
  constructor(private readonly brandProfileService: BrandProfileService) {}

  @Get()
  @ApiOperation({ summary: 'List all users with current brand access (paginated)' })
  @ApiOkResponse({ type: BrandsListResponseDto })
  async listBrands(
    @Query() query: ListBrandsQueryDto,
  ): Promise<BrandsListResponseDto> {
    return this.brandProfileService.listBrands(query);
  }

  @Delete('user/:userId/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove brand access from a user without deleting the user account' })
  async removeBrandAccess(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: RemoveBrandRoleDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.brandProfileService.removeBrandAccessFromUser(
      req.user.id,
      userId,
      dto,
    );
  }
}
```

---

## 9. Register the Admin Controller

#### [MODIFY] `brand-profile.module.ts`
Path: `server/src/brand-profile/brand-profile.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrandProfileController } from './brand-profile.controller';
import { AdminBrandController } from './admin-brand.controller';
import { BrandProfileService } from './brand-profile.service';

@Module({
  imports: [AuthModule],
  controllers: [BrandProfileController, AdminBrandController],
  providers: [BrandProfileService],
})
export class BrandProfileModule {}
```

---

## 10. Frontend Flow Expectation

#### Admin Page
Path: `client/app/admin/brandManagement/page.tsx`

Update the meaning of the delete action:

- label it as `Remove Brand Access` or `Revoke Brand Access`
- avoid wording that suggests the user account is being deleted

#### User Flow After Removal

Expected behavior:

1. User logs in.
2. If the user selects `BRAND` workspace again, backend rejects the request.
3. If the user tries to create a brand profile directly, backend rejects the request.
4. If the user still has `CREATOR`, they continue as a creator.
5. Otherwise, they remain a user account without brand access.

This is the intended permanent brand-removal flow.

---

## 11. Verification Plan

After implementation:

1. Run Prisma migration and generate client.
2. Start the server.
3. Verify `GET /admin/brands`:
   - returns users with effective `BRAND` role
   - includes user info and brand profile info
   - excludes revoked users
   - does not rely on fake brand profile IDs
4. Verify `DELETE /admin/brands/user/:userId/role`:
   - does not delete the `User`
   - removes `BRAND` from `UserRole`
   - if the user also has `CREATOR`, shifts `primaryRoleId` to `CREATOR`
   - if the user does not have `CREATOR`, clears `primaryRoleId`
   - clears active `BRAND` session workspace
   - if the user also has `CREATOR`, active role fallback becomes `CREATOR`
   - otherwise active role fallback becomes `null`
   - deletes `BrandProfile`
   - records revocation metadata
5. Verify removed user logs in again:
   - cannot choose `BRAND` workspace
   - `POST /brands/profile` is rejected
6. Verify `GET /brands/profile/me` still returns a valid `email` field for non-revoked brand users.
7. Verify creator flow remains intact for users who also have `CREATOR`.
8. Verify logo cleanup does not break the request if object deletion fails.

---

## Final Outcome

With this plan:

- brand management is correctly based on **users with brand role**
- removing a brand from admin list does **not** delete the user account
- current brand workspace state is cleaned up immediately
- if the user also had `CREATOR`, they continue as a creator after brand removal
- removed users cannot recreate a brand profile by themselves
- brand removal is permanent from the application flow perspective