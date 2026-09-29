import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A file only the real templates directory contains, used to tell a populated
 * directory from one that merely exists.
 */
export const TEMPLATE_MARKER = join('_partials', 'email-shell.html.hbs');

/**
 * Where the bundled `.hbs` files live at runtime.
 *
 * Prefer compiled `dist/mail/templates`. In `start:dev`, SWC can boot before
 * Nest copies assets; fall back to `src/mail/templates` when dist is empty.
 *
 * Shared by the renderer (which compiles them) and the template importer (which
 * copies them into the database), so the two can never disagree about which
 * directory is authoritative.
 */
export function resolveMailTemplatesDir(): string {
  const candidates = [
    join(__dirname, 'templates'),
    join(process.cwd(), 'src', 'mail', 'templates'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, TEMPLATE_MARKER))) {
      return dir;
    }
  }
  throw new Error(
    `Mail templates not found. Expected ${TEMPLATE_MARKER} under one of: ${candidates.join(', ')}`,
  );
}
