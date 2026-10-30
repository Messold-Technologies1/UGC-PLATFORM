import { Injectable, Logger } from '@nestjs/common';
import Handlebars from 'handlebars';
import type { TemplateDelegate } from 'handlebars';
import { deriveText } from './derive-text';
import { pushCopyFrom } from './push-copy';
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
  /** Null means no override: derive the notification from the email. */
  pushTitle: TemplateDelegate | null;
  pushBody: TemplateDelegate | null;
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
   * That derivation is the fallback, not a ceiling: a template can carry its
   * own `pushTitleHbs` and `pushBodyHbs`, written for a lock screen rather
   * than an inbox, and either one overrides its half independently.
   *
   * An override is rendered as written — truncated, because the platform
   * truncates anyway, but never greeting-stripped or sign-off-trimmed. Those
   * trims repair email conventions, and copy written for a notification has
   * none to repair.
   */
  async renderPush(req: RenderRequest): Promise<RenderedPush> {
    const row = await this.findTemplate(req);
    const rendered = await this.render(req);
    const ctx = this.legacy.applyDefaults(req.context);

    // An override is used as written. The trims below exist only because the
    // fallback's source is email copy — a subject that signs off with the site
    // name, a body that opens by greeting the reader — and applying them to
    // copy somebody wrote FOR a notification would quietly edit their words.
    const compiled = row ? this.compile(row) : null;

    const { title, body } = pushCopyFrom({
      renderedSubject: rendered.subject,
      renderedText: rendered.text,
      overrideTitle: compiled?.pushTitle?.(ctx),
      overrideBody: compiled?.pushBody?.(ctx),
      platformName: ctx.platformName,
    });

    return { title, body, templateId: rendered.templateId };
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

  /**
   * The notification a draft would produce, for the admin preview.
   *
   * Uncached like {@link renderDraft}, and routed through the same
   * {@link pushCopyFrom} the send path uses, so what the editor shows is what
   * would actually arrive — including when a field is left blank and the copy
   * falls back to the email.
   */
  renderPushDraft(draft: {
    subjectHbs: string;
    htmlHbs: string;
    textHbs?: string | null;
    pushTitleHbs?: string | null;
    pushBodyHbs?: string | null;
    context: EmailTemplateContext;
  }): { title: string; body: string } {
    const rendered = this.renderDraft(draft);
    const ctx = this.legacy.applyDefaults(draft.context);

    return pushCopyFrom({
      renderedSubject: rendered.subject,
      renderedText: rendered.text,
      overrideTitle: draft.pushTitleHbs
        ? Handlebars.compile(draft.pushTitleHbs)(ctx)
        : null,
      overrideBody: draft.pushBodyHbs
        ? Handlebars.compile(draft.pushBodyHbs)(ctx)
        : null,
      platformName: ctx.platformName,
    });
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
      pushTitleHbs: true,
      pushBodyHbs: true,
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
    pushTitleHbs?: string | null;
    pushBodyHbs?: string | null;
  }): CompiledTemplate {
    const cacheKey = `${row.id}:${row.version}`;
    const hit = this.cache.get(cacheKey);
    if (hit) return hit;

    const compiled: CompiledTemplate = {
      subject: Handlebars.compile(row.subjectHbs),
      body: Handlebars.compile(row.htmlHbs),
      text: row.textHbs ? Handlebars.compile(row.textHbs) : null,
      pushTitle: row.pushTitleHbs ? Handlebars.compile(row.pushTitleHbs) : null,
      pushBody: row.pushBodyHbs ? Handlebars.compile(row.pushBodyHbs) : null,
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
