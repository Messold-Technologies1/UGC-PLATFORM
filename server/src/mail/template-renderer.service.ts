import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import type { TemplateDelegate } from 'handlebars';
import {
  EmailTemplateKey,
  type EmailTemplateContext,
  type RenderedEmail,
} from './mail.types';

/**
 * Every template the renderer compiles at boot.
 *
 * Derived from the enum rather than hand-listed: a hand-maintained copy silently
 * drifts, and a key missing from it does not fail at boot — it throws
 * `Unknown email template` from {@link TemplateRendererService.render} at send
 * time, which the notifiers swallow into a single `logger.warn`. That is how
 * ORDER_EXTRA_REVISIONS_PURCHASED_FOR_BRAND and SOCIAL_CONNECTION_EXPIRED came
 * to send nothing on either channel despite having template files on disk.
 *
 * Deriving it means a new enum member without template files fails loudly at
 * boot instead.
 */
const ALL_TEMPLATE_KEYS: EmailTemplateKey[] = Object.values(EmailTemplateKey);

type CompiledSet = {
  subject: TemplateDelegate;
  htmlBody: TemplateDelegate;
  text: TemplateDelegate;
};

const TEMPLATE_MARKER = join('_partials', 'email-shell.html.hbs');

@Injectable()
export class TemplateRendererService implements OnModuleInit {
  private readonly logger = new Logger(TemplateRendererService.name);
  private templatesDir!: string;
  private shellTemplate!: TemplateDelegate;
  private readonly compiled = new Map<EmailTemplateKey, CompiledSet>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.templatesDir = this.resolveTemplatesDir();
    this.logger.log(`mail templates loaded from ${this.templatesDir}`);

    // `concat` lets a partial hash argument carry an interpolated string —
    // Handlebars has no string interpolation inside hash values, so a CTA label
    // that includes {{platformName}} has to be built as a subexpression:
    //   {{> actionButton url=actionUrl label=(concat "Get listed on " platformName)}}
    Handlebars.registerHelper('concat', (...args: unknown[]) =>
      args
        .slice(0, -1)
        .map((part) =>
          typeof part === 'string' || typeof part === 'number'
            ? String(part)
            : '',
        )
        .join(''),
    );

    const partialsDir = join(this.templatesDir, '_partials');
    Handlebars.registerPartial(
      'actionButton',
      readFileSync(join(partialsDir, 'action-button.html.hbs'), 'utf8'),
    );

    const shellPath = join(partialsDir, 'email-shell.html.hbs');
    this.shellTemplate = Handlebars.compile(readFileSync(shellPath, 'utf8'), {
      noEscape: false,
    });

    for (const key of ALL_TEMPLATE_KEYS) {
      this.compiled.set(key, this.loadTemplateSet(key));
    }
  }

  render(
    templateKey: EmailTemplateKey,
    context: EmailTemplateContext,
  ): RenderedEmail {
    const set = this.compiled.get(templateKey);
    if (!set) {
      throw new Error(`Unknown email template: ${templateKey}`);
    }

    const ctx = this.withDefaults(context);
    const bodyHtml = set.htmlBody(ctx).trim();
    const html = this.shellTemplate({ ...ctx, body: bodyHtml });

    return {
      subject: set.subject(ctx).trim(),
      html,
      text: set.text(ctx).trim(),
    };
  }

  /**
   * Wrap an already-rendered body in the shared email shell.
   *
   * Public so the DB-backed renderer can reuse the same chrome: admin-authored
   * templates supply only the body, and branding stays in one place.
   */
  wrapInShell(bodyHtml: string, context: EmailTemplateContext): string {
    return this.shellTemplate({ ...this.withDefaults(context), body: bodyHtml });
  }

  /** Platform-wide defaults (platformName, logoUrl, frontendUrl) merged under a context. */
  applyDefaults(context: EmailTemplateContext): EmailTemplateContext {
    return this.withDefaults(context);
  }

  private withDefaults(context: EmailTemplateContext): EmailTemplateContext {
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');

    return {
      platformName: 'Go Collab',
      logoUrl: this.config.get<string>('EMAIL_TEMPLATE_LOGO')?.trim(),
      frontendUrl,
      ...context,
    };
  }

  private loadTemplateSet(key: EmailTemplateKey): CompiledSet {
    const base = join(this.templatesDir, key);
    return {
      subject: this.compileFile(`${base}.subject.hbs`),
      htmlBody: this.compileFile(`${base}.html.hbs`),
      text: this.compileFile(`${base}.text.hbs`),
    };
  }

  private compileFile(path: string): TemplateDelegate {
    return Handlebars.compile(readFileSync(path, 'utf8'));
  }

  /**
   * Prefer compiled `dist/mail/templates`. In `start:dev`, SWC can boot before
   * Nest copies assets; fall back to `src/mail/templates` when dist is empty.
   */
  private resolveTemplatesDir(): string {
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
}
