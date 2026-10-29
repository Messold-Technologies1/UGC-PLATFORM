import { Injectable, Logger } from '@nestjs/common';
import Handlebars from 'handlebars';
import type { TemplateDelegate } from 'handlebars';
import { deriveText } from './derive-text';
import { pushTitleFrom, stripGreeting, truncateForPush } from './push-copy';
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

export type RenderedPush = {
  title: string;
  body: string;
  /** Recorded on the delivery log row, as the email path does. */
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

  /**
   * The same event, as a browser notification.
   *
   * Derived from the email rather than authored separately: the subject is
   * already a one-line statement of what happened, which is exactly what a
   * notification title is, and the plain-text part opens with the sentence
   * that explains it. That correspondence is what lets push be switched on
   * for any event in the catalog without writing thirty more templates first.
   *
   * It is a fallback, not a ceiling. Where a subject reads badly as a title —
   * too long, or written for an inbox rather than a lock screen — the answer
   * is a per-event push override, which is a column and an admin field this
   * does not have yet (docs/BROWSER_PUSH_PLAN.md §4.3).
   */
  async renderPush(req: RenderRequest): Promise<RenderedPush> {
    const rendered = await this.render(req);
    return {
      // Both trims exist because the source is email copy: a subject signs off
      // with the site name and a body opens by greeting the reader, and a
      // notification has room for neither.
      title: pushTitleFrom(
        rendered.subject,
        this.legacy.applyDefaults(req.context).platformName,
      ),
      body: truncateForPush(stripGreeting(rendered.text)),
      templateId: rendered.templateId,
    };
  }

  /**
   * Renders content that is not in the database — the admin editor previewing
   * unsaved edits.
   *
   * Deliberately uncached and never consulted by a send: it compiles whatever
   * it is handed, so a draft that is still mid-keystroke cannot leak into the
   * cache the send path reads. A broken draft throws, which the caller turns
   * into a message in the editor rather than a failed request.
   */
  renderDraft(draft: {
    subjectHbs: string;
    htmlHbs: string;
    textHbs?: string | null;
    context: EmailTemplateContext;
  }): RenderedEmail {
    const ctx = this.legacy.applyDefaults(draft.context);

    const subject = Handlebars.compile(draft.subjectHbs)(ctx).trim();
    const bodyHtml = Handlebars.compile(draft.htmlHbs)(ctx).trim();
    const html = this.legacy.wrapInShell(bodyHtml, draft.context);
    const text = draft.textHbs
      ? Handlebars.compile(draft.textHbs)(ctx).trim()
      : deriveText(bodyHtml);

    return { subject, html, text };
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

// Re-exported so existing importers keep working after the move.
export { deriveText, deriveTextHbs } from './derive-text';
