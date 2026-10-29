import { NotificationChannel, PrismaClient } from '@prisma/client';

/**
 * Ticks Browser on every existing notification schedule row.
 *
 * The seeder only ever CREATES rows — an admin's channel choices are never
 * rewritten from code — so a database seeded before push existed keeps its
 * email/WhatsApp rows forever. This is the one-time catch-up for those.
 *
 * Only ever ADDS: a row that has had email or WhatsApp switched off keeps it
 * off, because that was somebody's decision. Rows that already list PUSH are
 * left alone, so re-running changes nothing.
 *
 * Deliberately skips events that declare their own default channels. Order
 * chat is the case: it seeds as push-only on purpose, and this script has no
 * business widening it — nor would adding PUSH to a push-only row do anything.
 *
 *   npm run notifications:backfill-push        # apply
 *   npm run notifications:backfill-push -- --dry-run
 */

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const rows = await prisma.notificationSchedule.findMany({
    where: { NOT: { channels: { has: NotificationChannel.PUSH } } },
    select: {
      id: true,
      eventKey: true,
      offsetMinutes: true,
      channels: true,
      isActive: true,
    },
    orderBy: [{ eventKey: 'asc' }, { offsetMinutes: 'asc' }],
  });

  if (rows.length === 0) {
    console.log('Every schedule row already lists PUSH. Nothing to do.');
    return;
  }

  console.log(
    `${rows.length} schedule row(s) without PUSH:\n` +
      rows
        .map(
          (r) =>
            `  ${r.eventKey} @${r.offsetMinutes}min ` +
            `[${r.channels.join(', ') || 'none'}]` +
            `${r.isActive ? '' : ' (inactive)'}`,
        )
        .join('\n'),
  );

  if (dryRun) {
    console.log('\nDry run: nothing written.');
    return;
  }

  let updated = 0;
  for (const row of rows) {
    await prisma.notificationSchedule.update({
      where: { id: row.id },
      data: { channels: [...row.channels, NotificationChannel.PUSH] },
    });
    updated += 1;
  }

  console.log(
    `\nDone: PUSH added to ${updated} row(s).\n` +
      'Browser notifications now go out wherever that event already sends.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
