import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TemplateValidatorService } from './template-validator.service';
import type { NotificationVarSpec } from '../catalog/define-events';

const vars: Record<string, NotificationVarSpec> = {
  recipientName: { type: 'string', example: 'Rohit' },
  creatorName: { type: 'string', example: 'Ananya R' },
  actionUrl: { type: 'url', example: 'https://app.test/orders/1' },
};

describe('TemplateValidatorService', () => {
  const validator = new TemplateValidatorService();
  const ok = (subject: string, html: string, text?: string | null) =>
    validator.validate(
      { subjectHbs: subject, htmlHbs: html, textHbs: text },
      vars,
    );

  it('accepts a template using only declared variables', () => {
    const result = ok('Hi {{recipientName}}', '<p>From {{creatorName}}</p>');

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.referencedVars).toEqual(['creatorName', 'recipientName']);
  });

  it('rejects a variable the event does not provide', () => {
    // The failure this prevents is silent: {{brandNmae}} renders as nothing
    // and the email goes out looking wrong.
    const result = ok('Hi {{brandNmae}}', '<p>x</p>');

    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatchObject({
      part: 'subject',
      kind: 'unknown-variable',
    });
    expect(result.issues[0].message).toContain('brandNmae');
    // The message lists what IS available, so the fix is obvious.
    expect(result.issues[0].message).toContain('creatorName');
  });

  it('reports a syntax error instead of throwing', () => {
    const result = ok('{{#if recipientName}}unclosed', '<p>x</p>');

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.kind === 'syntax')).toBe(true);
  });

  it('rejects a helper the renderer does not provide', () => {
    const result = ok('{{uppercase recipientName}}', '<p>x</p>');

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.kind === 'unknown-helper')).toBe(true);
  });

  it('allows the concat helper and the actionButton partial', () => {
    const result = ok(
      'Hi {{recipientName}}',
      '{{> actionButton url=actionUrl label=(concat "Go to " creatorName)}}',
    );

    expect(result.issues).toEqual([]);
    // Variables used as helper arguments still count as referenced.
    expect(result.referencedVars).toContain('creatorName');
    expect(result.referencedVars).toContain('actionUrl');
  });

  it('rejects an unregistered partial', () => {
    const result = ok('Hi {{recipientName}}', '{{> somethingElse}}');

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.kind === 'unknown-partial')).toBe(true);
  });

  it('allows ambient variables the renderer always injects', () => {
    const result = ok('Welcome to {{platformName}}', '<p>{{frontendUrl}}</p>');
    expect(result.ok).toBe(true);
  });

  it('catches a subject that renders empty', () => {
    // SES rejects a message with no subject, so this must never reach a send.
    const result = ok('{{#if missingFlag}}never{{/if}}', '<p>body</p>');

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.kind === 'empty-render')).toBe(true);
  });

  it('treats block-helper conditions as variables', () => {
    const result = ok('Hi', '{{#if creatorName}}<p>{{creatorName}}</p>{{/if}}');

    expect(result.ok).toBe(true);
    expect(result.referencedVars).toContain('creatorName');
  });

  it('validates the plain-text part too', () => {
    const result = ok('Hi {{recipientName}}', '<p>ok</p>', 'Hi {{nope}}');

    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatchObject({
      part: 'text',
      kind: 'unknown-variable',
    });
  });

  it('accepts a real bundled template against its event vars', () => {
    // The gate must not reject the templates that ship today.
    const dir = join(__dirname, '..', '..', 'mail', 'templates');
    const key = 'order-content-delivered-for-brand';
    const result = validator.validate(
      {
        subjectHbs: readFileSync(join(dir, `${key}.subject.hbs`), 'utf8'),
        htmlHbs: readFileSync(join(dir, `${key}.html.hbs`), 'utf8'),
        textHbs: readFileSync(join(dir, `${key}.text.hbs`), 'utf8'),
      },
      {
        recipientName: { type: 'string', example: 'Rohit' },
        creatorName: { type: 'string', example: 'Ananya R' },
        packageName: { type: 'string', example: 'Standard' },
        orderId: { type: 'string', example: 'ord_1' },
        deliveredAt: { type: 'date', example: '02 Oct 2026' },
        revisionNumber: { type: 'number', example: '1' },
        actionUrl: { type: 'url', example: 'https://app.test/o/1' },
      },
    );

    expect(result.issues).toEqual([]);
  });
});
