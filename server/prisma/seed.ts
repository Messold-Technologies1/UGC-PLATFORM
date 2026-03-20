import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const db = prisma as any;
const roleNames = ['ADMIN', 'CREATOR', 'BRAND'] as const;
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
};

const serviceTypes = [
  'UGC_VIDEO',
  'UGC_PHOTO',
  'PRODUCT_REVIEW',
  'UNBOXING',
  'VOICE_OVER',
];

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

async function seedServiceTypes(): Promise<void> {
  await Promise.all(
    serviceTypes.map((name) =>
      db.serviceType.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
}

async function main(): Promise<void> {
  await seedRolesAndPermissions();
  await seedServiceTypes();
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
