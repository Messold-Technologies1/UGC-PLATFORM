import { Injectable, Logger } from '@nestjs/common';
import Handlebars from 'handlebars';
import type { TemplateDelegate } from 'handlebars';
import { parse as parseHtml } from 'node-html-parser';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateRendererService } from '../../mail/template-renderer.service';
import {
  EmailTemplateKey,
  type EmailTemplateContext,
  type RenderedEmail,
} from '../../mail/mail.types';

type CompiledTemplate = {
  subject: TemplateDelegate;
  body: TemplateDelegate;
  text: TemplateDelegate | null;
};

export type RenderRequest = {
  /** A schedule row's override, or the event's own template. Tried first. */
  templateId?: string | null;
  /** The event key, which is also the template's default name. */
  templateName: string;
  context: EmailTemplateContext;
};

export type RenderResult = RenderedEmail & {
  /** Where the content came from — useful in the delivery log and in tests. */
  source: 'db' | 'disk';
  templateId: string | null;
};

/**
 * Renders an email from the database, falling back to the bundled `.hbs` files.
 *
 * The fallback is what makes the migration invisible: until a template row
 * exists for a key, the file that ships today is used, byte for byte. Once a
 * row exists, admin edits take effect on the next send — compiled templates are
 * cached by `id:version`, and saving bumps the version, so nothing needs a
 * restart.
 */
@Injectable()
export class NotificationTemplateRenderer {
  private readonly logger = new Logger(NotificationTemplateRenderer.name);
  private readonly cache = new Map<string, CompiledTemplate>();
  /** Bounded so a long-lived worker cannot accumulate every version ever saved. */
  private static readonly CACHE_MAX = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly legacy: TemplateRendererService,
  ) {}

  async render(req: RenderRequest): Promise<RenderResult> {
    const row = await this.findTemplate(req);

    if (!row) {
      // No DB row yet: render the file that ships in the repo.
      const rendered = this.legacy.render(
        req.templateName as EmailTemplateKey,
        req.context,
      );
      return { ...rendered, source: 'disk', templateId: null };
    }

    const compiled = this.compile(row);
    const ctx = this.legacy.applyDefaults(req.context);

    const subject = compiled.subject(ctx).trim();
    const bodyHtml = compiled.body(ctx).trim();
    const html = this.legacy.wrapInShell(bodyHtml, req.context);
    const text = compiled.text
      ? compiled.text(ctx).trim()
      : // No plain-text variant stored: derive one from the rendered body so
        // the message is never sent HTML-only.
        deriveText(bodyHtml);

    return { subject, html, text, source: 'db', templateId: row.id };
  }

  /** Clears the compiled cache. Used after a template is saved in the same process. */
  invalidate(): void {
    this.cache.clear();
  }

  private async findTemplate(req: RenderRequest) {
    const select = {
      id: true,
      version: true,
      subjectHbs: true,
      htmlHbs: true,
      textHbs: true,
      isActive: true,
    } as const;

    if (req.templateId) {
      const byId = await this.prisma.notificationTemplate.findUnique({
        where: { id: req.templateId },
        select,
      });
      // An inactive or deleted override falls through to the name lookup
      // rather than failing the send.
      if (byId?.isActive) return byId;
      if (byId && !byId.isActive) {
        this.logger.warn(
          `template ${req.templateId} is inactive; falling back for ${req.templateName}`,
        );
      }
    }

    const byName = await this.prisma.notificationTemplate.findUnique({
      where: { name: req.templateName },
      select,
    });
    return byName?.isActive ? byName : null;
  }

  private compile(row: {
    id: string;
    version: number;
    subjectHbs: string;
    htmlHbs: string;
    textHbs: string | null;
  }): CompiledTemplate {
    const cacheKey = `${row.id}:${row.version}`;
    const hit = this.cache.get(cacheKey);
    if (hit) return hit;

    const compiled: CompiledTemplate = {
      subject: Handlebars.compile(row.subjectHbs),
      body: Handlebars.compile(row.htmlHbs),
      text: row.textHbs ? Handlebars.compile(row.textHbs) : null,
    };

    if (this.cache.size >= NotificationTemplateRenderer.CACHE_MAX) {
      // Evict the oldest entry; Map preserves insertion order.
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(cacheKey, compiled);
    return compiled;
  }
}

/**
 * A readable plain-text part from rendered HTML: block elements become line
 * breaks, links keep their target, and runs of blank lines collapse.
 */
export function deriveText(html: string): string {
  const root = parseHtml(html);
  root.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    const label = a.textContent.trim();
    if (href && label && !label.includes(href)) {
      a.replaceWith(`${label} (${href})`);
    }
  });
  root
    .querySelectorAll('p, div, br, tr, h1, h2, h3, h4, li')
    .forEach((el) => el.insertAdjacentHTML('afterend', '\n'));

  return root.textContent
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
