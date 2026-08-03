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

const ALL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  EmailTemplateKey.CREATOR_PROFILE_APPROVED,
  EmailTemplateKey.CREATOR_PROFILE_REJECTED,
  EmailTemplateKey.CREATOR_PROFILE_COMPLETION_REMINDER,
  EmailTemplateKey.ORDER_BRIEF_SUBMITTED_FOR_CREATOR,
  EmailTemplateKey.ORDER_BRIEF_ACCEPTED_FOR_BRAND,
  EmailTemplateKey.ORDER_PRODUCT_SHIPPED_FOR_CREATOR,
  EmailTemplateKey.ORDER_PRODUCT_RECEIVED_FOR_BRAND,
  EmailTemplateKey.ORDER_REVISION_REQUESTED_FOR_CREATOR,
  EmailTemplateKey.ORDER_CONTENT_DELIVERED_FOR_BRAND,
  EmailTemplateKey.ORDER_CONTENT_ACCEPTED_FOR_CREATOR,
  EmailTemplateKey.ORDER_COMPLETED_FOR_BRAND,
  EmailTemplateKey.ORDER_REJECTED_FOR_BRAND,
  EmailTemplateKey.ORDER_REJECTED_FOR_CREATOR,
  EmailTemplateKey.ORDER_REFUNDED_FOR_BRAND,
  EmailTemplateKey.ORDER_DISPUTE_OPENED_FOR_BRAND,
  EmailTemplateKey.ORDER_DISPUTE_OPENED_FOR_CREATOR,
  EmailTemplateKey.ORDER_DISPUTE_RESOLVED_FOR_BRAND,
  EmailTemplateKey.ORDER_DISPUTE_RESOLVED_FOR_CREATOR,
  EmailTemplateKey.PASSWORD_RESET,
];

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

    const partialsDir = join(this.templatesDir, '_partials');
    Handlebars.registerPartial(
      'actionButton',
      readFileSync(join(partialsDir, 'action-button.html.hbs'), 'utf8'),
    );

    const shellPath = join(partialsDir, 'email-shell.html.hbs');
    this.shellTemplate = Handlebars.compile(
      readFileSync(shellPath, 'utf8'),
      { noEscape: false },
    );

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

  private withDefaults(
    context: EmailTemplateContext,
  ): EmailTemplateContext {
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
