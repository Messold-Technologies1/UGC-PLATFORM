import { PrismaClient, NotificationChannel } from '@prisma/client';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  hasStageBlocks,
  splitStageTemplate,
} from '../src/notifications/rendering/split-stage-template';
import {
  NOTIFICATION_EVENT_KEYS,
  defaultWhatsAppTemplateName,
} from '../src/notifications/catalog/event-catalog';

/**
 * Imports the bundled `.hbs` templates into `NotificationTemplate`, splits the
 * two stage-switching templates into one per stage, links each event to its
 * template, and seeds one immediate schedule row per event.
 *
 * Idempotent: re-running updates content in place and never duplicates rows.
 * It deliberately does NOT touch a template whose content an admin has already
 * changed — the seed is a starting point, not an authority.
 *
 *   npm run prisma:seed:notification-templates
 */

const prisma = new PrismaClient();
const TEMPLATES_DIR = join(__dirname, '..', 'src', 'mail', 'templates');

/** Drip offsets, matching COMPLETION_STAGE_DELAY_MS / RESUBMIT_STAGE_DELAY_MS. */
const STAGE_OFFSETS: Record<string, number[]> = {
  'creator-profile-completion-reminder': [30, 24 * 60, 3 * 24 * 60, 7 * 24 * 60],
  'creator-profile-resubmit-reminder': [30, 24 * 60, 48 * 60],
};

/**
 * Suffix used to name a split template: `-30m`, `-24h`, `-48h`, `-3d`, `-7d`.
 *
 * Hours are kept up to two days so the names read the way the drips are
 * described (30min / 24h / 3d / 7d, and 30min / 24h / 48h) rather than
 * collapsing 1440 to `1d`.
 */
const HOURS_CUTOFF_MINUTES = 3 * 24 * 60;

function offsetSuffix(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < HOURS_CUTOFF_MINUTES && minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  if (minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}d`;
  return `${minutes}m`;
}

function readPart(key: string, part: 'subject' | 'html' | 'text'): string | null {
  const path = join(TEMPLATES_DIR, `${key}.${part}.hbs`);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

type SeedTemplate = {
  name: string;
  subjectHbs: string;
  htmlHbs: string;
  textHbs: string | null;
  description: string;
};

/** One template per key, or several when the key carries stage switches. */
function buildTemplates(key: string): SeedTemplate[] {
  const subject = readPart(key, 'subject');
  const html = readPart(key, 'html');
  const text = readPart(key, 'text');

  if (subject === null || html === null) {
    throw new Error(`template files missing for ${key}`);
  }

  if (!hasStageBlocks(html)) {
    return [
      {
        name: key,
        subjectHbs: subject.trim(),
        htmlHbs: html.trim(),
        textHbs: text?.trim() ?? null,
        description: 'Imported from the bundled template files.',
      },
    ];
  }

  const offsets = STAGE_OFFSETS[key];
  if (!offsets) {
    throw new Error(`${key} has stage blocks but no offsets are declared`);
  }

  const subjects = splitStageTemplate(subject);
  const bodies = splitStageTemplate(html);
  const texts = text ? splitStageTemplate(text) : [];

  if (subjects.length !== offsets.length || bodies.length !== offsets.length) {
    throw new Error(
      `${key}: expected ${offsets.length} stages, found ${bodies.length} bodies / ${subjects.length} subjects`,
    );
  }

  return bodies.map((body, i) => {
    const suffix = offsetSuffix(offsets[i]);
    return {
      name: `${key}-${suffix}`,
      subjectHbs: subjects[i].content,
      htmlHbs: body.content,
      textHbs: texts[i]?.content ?? null,
      description: `Stage ${body.stage} of the ${key} drip (+${suffix}).`,
    };
  });
}

async function upsertTemplate(t: SeedTemplate): Promise<string> {
  const existing = await prisma.notificationTemplate.findUnique({
    where: { name: t.name },
    select: { id: true, updatedByUserId: true },
  });

  // An admin has edited this one; leave their copy alone.
  if (existing?.updatedByUserId) {
    console.log(`  = ${t.name} (admin-edited, left as is)`);
    return existing.id;
  }

  const row = await prisma.notificationTemplate.upsert({
    where: { name: t.name },
    update: {
      subjectHbs: t.subjectHbs,
      htmlHbs: t.htmlHbs,
      textHbs: t.textHbs,
      description: t.description,
    },
    create: { ...t },
    select: { id: true },
  });
  console.log(`  ${existing ? '~' : '+'} ${t.name}`);
  return row.id;
}

async function main(): Promise<void> {
  console.log(`Seeding notification templates from ${TEMPLATES_DIR}`);

  const onDisk = readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.subject.hbs'))
    .map((f) => f.replace('.subject.hbs', ''));
  console.log(`  ${onDisk.length} template key(s) on disk\n`);

  const idsByName = new Map<string, string>();

  for (const key of onDisk) {
    for (const template of buildTemplates(key)) {
      idsByName.set(template.name, await upsertTemplate(template));
    }
  }

  console.log(`\nLinking events and seeding schedules`);
  for (const key of NOTIFICATION_EVENT_KEYS) {
    const event = await prisma.notificationEvent.findUnique({
      where: { key },
      select: { key: true, emailTemplateId: true, whatsappTemplateName: true },
    });
    if (!event) {
      console.log(`  ! ${key} not in NotificationEvent — run the app once to sync`);
      continue;
    }

    // The drips point their rows at per-stage templates, so the event-level
    // template stays null for them.
    const offsets = STAGE_OFFSETS[key] ?? [0];
    const isDrip = Boolean(STAGE_OFFSETS[key]);

    if (!isDrip && !event.emailTemplateId) {
      const templateId = idsByName.get(key);
      if (templateId) {
        await prisma.notificationEvent.update({
          where: { key },
          data: { emailTemplateId: templateId },
        });
      }
    }

    for (const [i, offsetMinutes] of offsets.entries()) {
      const existing = await prisma.notificationSchedule.findUnique({
        where: { eventKey_offsetMinutes: { eventKey: key, offsetMinutes } },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.notificationSchedule.create({
        data: {
          eventKey: key,
          offsetMinutes,
          // Both channels, reproducing today's behaviour exactly: every email
          // currently fires its WhatsApp twin via whatsapp-bridge.util.
          channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
          templateOverrideId: isDrip
            ? (idsByName.get(`${key}-${offsetSuffix(offsetMinutes)}`) ?? null)
            : null,
          sortOrder: i,
        },
      });
    }
    console.log(`  ✓ ${key} (${offsets.length} row(s), wa=${event.whatsappTemplateName ?? defaultWhatsAppTemplateName(key)})`);
  }

  const [templates, schedules] = await Promise.all([
    prisma.notificationTemplate.count(),
    prisma.notificationSchedule.count(),
  ]);
  console.log(`\nDone: ${templates} template(s), ${schedules} schedule row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
