import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hasStageBlocks, splitStageTemplate } from './split-stage-template';

/**
 * Reads the bundled `.hbs` files and turns them into rows ready for
 * `NotificationTemplate`.
 *
 * Pure: it touches the filesystem but never the database, so both the boot-time
 * importer and the standalone seeder script build identical rows from one
 * implementation. Before this was shared, the two could drift and only the
 * seeder's version was ever exercised.
 */

/** Drip offsets, matching COMPLETION_STAGE_DELAY_MS / RESUBMIT_STAGE_DELAY_MS. */
export const STAGE_OFFSETS: Record<string, number[]> = {
  'creator-profile-completion-reminder': [
    30,
    24 * 60,
    3 * 24 * 60,
    7 * 24 * 60,
  ],
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

export function offsetSuffix(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < HOURS_CUTOFF_MINUTES && minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  if (minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}d`;
  return `${minutes}m`;
}

export type BundledTemplate = {
  name: string;
  subjectHbs: string;
  htmlHbs: string;
  textHbs: string | null;
  description: string;
};

function readPart(
  dir: string,
  key: string,
  part: 'subject' | 'html' | 'text',
): string | null {
  const path = join(dir, `${key}.${part}.hbs`);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** Every template key with a `.subject.hbs` on disk. */
export function listBundledKeys(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.subject.hbs'))
    .map((f) => f.replace('.subject.hbs', ''))
    .sort();
}

/** One template per key, or several when the key carries stage switches. */
export function buildTemplates(dir: string, key: string): BundledTemplate[] {
  const subject = readPart(dir, key, 'subject');
  const html = readPart(dir, key, 'html');
  const text = readPart(dir, key, 'text');

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

/** Every bundled template, drips already split into one row per stage. */
export function readBundledTemplates(dir: string): BundledTemplate[] {
  return listBundledKeys(dir).flatMap((key) => buildTemplates(dir, key));
}
