import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedCreatorFacetOptions } from './creator-facet-seed';
import { seedCreatorAddOnOptions } from './creator-addon-options-seed';
import { seedLegalPages } from './seed-legal-pages';

const prisma = new PrismaClient();
const db = prisma as any;
const roleNames = ['ADMIN', 'CREATOR', 'BRAND', 'AGENCY'] as const;
type RoleName = (typeof roleNames)[number];

const permissionsByRole: Record<RoleName, string[]> = {
  ADMIN: [
    'APPROVE_CREATOR',
    'FEATURE_LISTING',
    'SUSPEND_USER',
    'RESOLVE_DISPUTE',
    'OVERRIDE_ORDER_STATUS',
  ],
  CREATOR: [
    'CREATE_PROFILE',
    'UPLOAD_PORTFOLIO',
    'ACCEPT_ORDER',
    'DELIVER_CONTENT',
  ],
  BRAND: [
    'SEARCH_CREATORS',
    'CREATE_ORDER',
    'REQUEST_REVISION',
    'APPROVE_DELIVERY',
  ],
  AGENCY: [
    'MANAGE_AGENCY_BRANDS',
    'SEARCH_CREATORS',
    'CREATE_ORDER',
    'REQUEST_REVISION',
    'APPROVE_DELIVERY',
  ],
};

import {
  CREATOR_RESTRICTION_SUGGESTIONS,
  normalizeRestrictionSuggestion,
} from './creator-restriction-suggestions';

const portfolioIndustryLabels = [
  'Coworking',
  'Clinic',
  'Salon',
  'Gym',
  'Restaurant',
  'Real Estate',
  'Fashion',
  'Skincare',
];

const portfolioTags = [
  'testimonial',
  'founder intro',
  'office tour',
  'walkthrough',
  'talking head',
  'aesthetic reel',
  'product demo',
  'voiceover',
  'luxury',
  'relatable',
];

function normalizeSuggestion(value: string): string {
  return normalizeRestrictionSuggestion(value);
}

async function seedRolesAndPermissions(): Promise<void> {
  const allPermissions = [...new Set(Object.values(permissionsByRole).flat())];

  await Promise.all(
    roleNames.map((name) =>
      db.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  await Promise.all(
    allPermissions.map((name) =>
      db.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  for (const [roleName, permissionNames] of Object.entries(permissionsByRole) as [
    RoleName,
    string[],
  ][]) {
    const role = await db.role.findUniqueOrThrow({
      where: { name: roleName },
      select: { id: true },
    });

    const permissions = await db.permission.findMany({
      where: { name: { in: permissionNames } },
      select: { id: true, name: true },
    });

    for (const permission of permissions) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function seedCreatorSuggestions(): Promise<void> {
  await db.creatorRestrictionSuggestion.createMany({
    data: CREATOR_RESTRICTION_SUGGESTIONS.map((name) => ({
      name,
      normalizedName: normalizeSuggestion(name),
    })),
    skipDuplicates: true,
  });
}

async function seedPortfolioSuggestions(): Promise<void> {
  for (const name of portfolioIndustryLabels) {
    const normalizedName = normalizeSuggestion(name);
    await db.portfolioIndustrySuggestion.upsert({
      where: { normalizedName },
      create: { name, normalizedName },
      update: { name },
    });
  }

  await db.portfolioTagSuggestion.createMany({
    data: portfolioTags.map((name) => ({
      name,
      normalizedName: normalizeSuggestion(name),
    })),
    skipDuplicates: true,
  });
}

async function seedBootstrapAdmin(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Platform Admin';

  if (!email || !password) {
    console.warn(
      '[seed] Skipping bootstrap admin. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to enable.',
    );
    return;
  }

  const adminRole = await db.role.findUnique({
    where: { name: 'ADMIN' },
    select: { id: true },
  });
  if (!adminRole) {
    throw new Error('Missing ADMIN role. seedRolesAndPermissions must run first.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      status: 'ACTIVE',
      primaryRoleId: adminRole.id,
      emailVerified: true,
    },
    create: {
      email,
      name,
      passwordHash,
      status: 'ACTIVE',
      primaryRoleId: adminRole.id,
      emailVerified: true,
    },
    select: { id: true, email: true },
  });

  await db.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  console.log(`[seed] Bootstrap admin ensured for ${user.email}`);
}

async function main(): Promise<void> {
  await seedRolesAndPermissions();
  await seedCreatorFacetOptions(prisma);
  await seedCreatorAddOnOptions(prisma);
  await seedCreatorSuggestions();
  await seedPortfolioSuggestions();
  await seedBootstrapAdmin();
  await seedLegalPages(prisma);
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
