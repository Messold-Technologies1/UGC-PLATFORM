import { Injectable } from '@nestjs/common';
import Handlebars from 'handlebars';
import type { NotificationVarSpec } from '../catalog/define-events';

/**
 * Helpers a template may use. Anything else is rejected at save time rather
 * than rendering as empty at two in the morning.
 *
 * `concat` builds an interpolated string for a partial's hash argument, which
 * Handlebars cannot do inline. The block helpers are built in.
 */
const ALLOWED_HELPERS = new Set([
  'concat',
  'if',
  'unless',
  'each',
  'with',
  'log',
  'lookup',
  'blockHelperMissing',
  'helperMissing',
]);

/** Partials registered by the renderer and available to every template. */
const ALLOWED_PARTIALS = new Set(['actionButton']);

/**
 * An isolated Handlebars environment for the example render.
 *
 * Separate from the global one on purpose: validation must not depend on the
 * renderer having booted first, and must never mutate the environment real
 * sends compile in. The helper and partial are stand-ins whose only job is to
 * let a valid template render to something non-empty.
 */
const validationEnv = Handlebars.create();
validationEnv.registerHelper('concat', (...args: unknown[]) =>
  args
    .slice(0, -1)
    .map((part) =>
      typeof part === 'string' || typeof part === 'number' ? String(part) : '',
    )
    .join(''),
);
validationEnv.registerPartial(
  'actionButton',
  '<a href="{{url}}">{{#if label}}{{label}}{{else}}Open{{/if}}</a>',
);

/** Always injected by the renderer, so a template may use them un-declared. */
const AMBIENT_VARS = new Set([
  'platformName',
  'logoUrl',
  'frontendUrl',
  'body',
  'stepIndex',
  'stepOffsetMinutes',
]);

export type TemplateIssue = {
  part: 'subject' | 'html' | 'text';
  kind:
    | 'syntax'
    | 'unknown-variable'
    | 'unknown-helper'
    | 'unknown-partial'
    | 'empty-render';
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: TemplateIssue[];
  /** Variable names the template actually references, for lazy resolution. */
  referencedVars: string[];
};

export type TemplateParts = {
  subjectHbs: string;
  htmlHbs: string;
  textHbs?: string | null;
};

/**
 * Checks a template before it can be saved.
 *
 * The failure mode this exists for is silent: a typo'd variable renders as
 * nothing and the email goes out looking wrong, with no error anywhere. So the
 * gate is deliberately strict — unknown variables and helpers are errors, not
 * warnings.
 */
@Injectable()
export class TemplateValidatorService {
  /**
   * @param declaredVars the union of every referencing event's declared vars.
   *   A template shared by several events must satisfy all of them.
   */
  validate(
    parts: TemplateParts,
    declaredVars: Record<string, NotificationVarSpec>,
  ): ValidationResult {
    const issues: TemplateIssue[] = [];
    const referenced = new Set<string>();
    const known = new Set([...Object.keys(declaredVars), ...AMBIENT_VARS]);

    const sources: Array<[TemplateIssue['part'], string | null | undefined]> = [
      ['subject', parts.subjectHbs],
      ['html', parts.htmlHbs],
      ['text', parts.textHbs],
    ];

    for (const [part, source] of sources) {
      if (source === null || source === undefined) continue;

      let ast: hbs.AST.Program;
      try {
        ast = Handlebars.parse(source);
      } catch (err) {
        issues.push({
          part,
          kind: 'syntax',
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      const found = walk(ast);
      for (const name of found.variables) {
        referenced.add(name);
        if (!known.has(name)) {
          issues.push({
            part,
            kind: 'unknown-variable',
            message: `{{${name}}} is not available on this event. Available: ${[
              ...Object.keys(declaredVars),
            ]
              .sort()
              .join(', ')}`,
          });
        }
      }
      for (const helper of found.helpers) {
        if (!ALLOWED_HELPERS.has(helper)) {
          issues.push({
            part,
            kind: 'unknown-helper',
            message: `{{${helper}}} is not a helper this renderer provides.`,
          });
        }
      }
      for (const partial of found.partials) {
        if (!ALLOWED_PARTIALS.has(partial)) {
          issues.push({
            part,
            kind: 'unknown-partial',
            message: `{{> ${partial}}} is not a registered partial.`,
          });
        }
      }
    }

    // Only worth rendering once the syntax is sound.
    if (!issues.some((i) => i.kind === 'syntax')) {
      issues.push(...this.checkExampleRender(parts, declaredVars));
    }

    return {
      ok: issues.length === 0,
      issues,
      referencedVars: [...referenced].sort(),
    };
  }

  /**
   * Render against each variable's declared example. Catches the case where a
   * template parses but produces nothing — an empty subject, which SES rejects
   * outright, or an empty body.
   */
  private checkExampleRender(
    parts: TemplateParts,
    declaredVars: Record<string, NotificationVarSpec>,
  ): TemplateIssue[] {
    const context: Record<string, string> = { platformName: 'Go Collab' };
    for (const [name, spec] of Object.entries(declaredVars)) {
      context[name] = spec.example;
    }

    const issues: TemplateIssue[] = [];
    const check = (part: TemplateIssue['part'], source?: string | null) => {
      if (!source) return;
      try {
        const out = validationEnv.compile(source)(context).trim();
        if (out.length === 0) {
          issues.push({
            part,
            kind: 'empty-render',
            message: `Renders empty with example values${
              part === 'subject'
                ? ' — SES rejects a message with no subject.'
                : '.'
            }`,
          });
        }
      } catch (err) {
        issues.push({
          part,
          kind: 'syntax',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    };

    check('subject', parts.subjectHbs);
    check('html', parts.htmlHbs);
    check('text', parts.textHbs);
    return issues;
  }
}

type Found = {
  variables: Set<string>;
  helpers: Set<string>;
  partials: Set<string>;
};

/**
 * Walk the Handlebars AST collecting every path reference, split into plain
 * variables and helper invocations.
 *
 * A mustache with parameters is a helper call (`{{concat a b}}`); one without
 * is a variable (`{{brandName}}`). Block helpers are always helpers. Paths used
 * as arguments are variables regardless of position.
 */
function walk(node: unknown): Found {
  const found: Found = {
    variables: new Set(),
    helpers: new Set(),
    partials: new Set(),
  };

  const addPath = (path: unknown, into: Set<string>) => {
    const p = path as { type?: string; parts?: string[]; original?: string };
    if (p?.type !== 'PathExpression') return;
    // Only top-level names matter: contexts here are flat scalars.
    const name = p.parts?.[0];
    if (name && !p.original?.startsWith('@')) into.add(name);
  };

  const visitParams = (params: unknown[] | undefined) => {
    for (const param of params ?? []) {
      addPath(param, found.variables);
      const sub = param as { type?: string };
      if (sub?.type === 'SubExpression') {
        const merged = walk(param);
        merged.variables.forEach((v) => found.variables.add(v));
        merged.helpers.forEach((h) => found.helpers.add(h));
      }
    }
  };

  const visit = (n: unknown): void => {
    const cur = n as {
      type?: string;
      body?: unknown[];
      program?: unknown;
      inverse?: unknown;
      path?: unknown;
      params?: unknown[];
      hash?: { pairs?: Array<{ value: unknown }> };
      name?: unknown;
    };
    if (!cur || typeof cur !== 'object') return;

    switch (cur.type) {
      case 'Program':
        cur.body?.forEach(visit);
        return;
      case 'MustacheStatement':
      case 'SubExpression': {
        const hasArgs =
          (cur.params?.length ?? 0) > 0 || (cur.hash?.pairs?.length ?? 0) > 0;
        addPath(cur.path, hasArgs ? found.helpers : found.variables);
        visitParams(cur.params);
        cur.hash?.pairs?.forEach((pair) => {
          addPath(pair.value, found.variables);
          const sub = pair.value as { type?: string };
          if (sub?.type === 'SubExpression') {
            const merged = walk(pair.value);
            merged.variables.forEach((v) => found.variables.add(v));
            merged.helpers.forEach((h) => found.helpers.add(h));
          }
        });
        return;
      }
      case 'BlockStatement':
        addPath(cur.path, found.helpers);
        visitParams(cur.params);
        if (cur.program) visit(cur.program);
        if (cur.inverse) visit(cur.inverse);
        return;
      case 'PartialStatement': {
        const name = cur.name as { original?: string };
        if (name?.original) found.partials.add(name.original);
        visitParams(cur.params);
        cur.hash?.pairs?.forEach((pair) => {
          addPath(pair.value, found.variables);
          const sub = pair.value as { type?: string };
          if (sub?.type === 'SubExpression') {
            const merged = walk(pair.value);
            merged.variables.forEach((v) => found.variables.add(v));
            merged.helpers.forEach((h) => found.helpers.add(h));
          }
        });
        return;
      }
      default:
        return;
    }
  };

  visit(node);
  return found;
}
