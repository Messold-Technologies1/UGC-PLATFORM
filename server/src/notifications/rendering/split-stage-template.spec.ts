import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasStageBlocks, splitStageTemplate } from './split-stage-template';

const TEMPLATES = join(__dirname, '..', '..', 'mail', 'templates');
const read = (f: string) => readFileSync(join(TEMPLATES, f), 'utf8');

describe('splitStageTemplate', () => {
  it('returns nothing for a template with no stage blocks', () => {
    expect(splitStageTemplate('<p>Hi {{recipientName}}</p>')).toEqual([]);
    expect(hasStageBlocks('<p>Hi</p>')).toBe(false);
  });

  it('keeps shared copy on every stage and varies only the block', () => {
    const src =
      'HEAD {{#if isStage1}}ONE{{/if}}{{#if isStage2}}TWO{{/if}} TAIL';

    expect(splitStageTemplate(src)).toEqual([
      { stage: 1, content: 'HEAD ONE TAIL' },
      { stage: 2, content: 'HEAD TWO TAIL' },
    ]);
  });

  it('throws on an unclosed block rather than silently truncating', () => {
    expect(() => splitStageTemplate('{{#if isStage1}}oops')).toThrow(
      'Unclosed {{#if isStage1}} block',
    );
  });

  describe('against the real completion-reminder files', () => {
    const html = read('creator-profile-completion-reminder.html.hbs');
    const subject = read('creator-profile-completion-reminder.subject.hbs');
    const text = read('creator-profile-completion-reminder.text.hbs');

    it('finds all four stages in each part', () => {
      expect(splitStageTemplate(html).map((s) => s.stage)).toEqual([
        1, 2, 3, 4,
      ]);
      expect(splitStageTemplate(subject).map((s) => s.stage)).toEqual([
        1, 2, 3, 4,
      ]);
      expect(splitStageTemplate(text).map((s) => s.stage)).toEqual([
        1, 2, 3, 4,
      ]);
    });

    it('gives each stage its own subject, with no leftover conditionals', () => {
      const subjects = splitStageTemplate(subject).map((s) => s.content);

      expect(subjects).toEqual([
        'Your {{platformName}} profile is almost ready 👀',
        "You started it. Don't leave it halfway 👀",
        'What if a brand is looking for someone like you?',
        'Still want to be listed on {{platformName}}?',
      ]);
    });

    it('keeps the shared greeting and sign-off on every stage', () => {
      for (const { content } of splitStageTemplate(html)) {
        expect(content).toContain('Hi {{recipientName}}, 👋');
        expect(content).toContain('— Team {{platformName}} 💗');
      }
    });

    it('leaves no stage conditionals behind and no other stage copy', () => {
      const [one, two, three, four] = splitStageTemplate(html);

      for (const part of [one, two, three, four]) {
        expect(part.content).not.toContain('{{#if isStage');
        expect(part.content).not.toContain('{{/if}}');
      }

      expect(one.content).toContain('just a few minutes left to get it live');
      expect(one.content).not.toContain(
        "You started it. Don't leave it halfway",
      );
      expect(three.content).toContain("Brands don't always need creators");
      expect(four.content).toContain('5 minutes. One profile.');
    });

    it('drops the stage variables from the context comment', () => {
      // The comment lists the variables a template uses; isStage* are gone now.
      const [one] = splitStageTemplate(html);
      expect(one.content).toContain('{{!-- context:');
      expect(one.content).not.toContain('isStage');
    });

    it('preserves partials and helper subexpressions used inside a stage', () => {
      const three = splitStageTemplate(html)[2];
      // Stage 3's CTA is built with the `concat` helper — losing it would
      // render an empty button label.
      expect(three.content).toContain(
        '{{> actionButton url=actionUrl label=(concat "Get Listed on " platformName " →")}}',
      );
    });

    it('splits the text part too, keeping the action URL', () => {
      const parts = splitStageTemplate(text);
      expect(parts).toHaveLength(4);
      for (const { content } of parts) {
        expect(content).toContain('Hi {{recipientName}},');
        expect(content).toContain('{{actionUrl}}');
        expect(content).not.toContain('{{#if isStage');
      }
    });
  });

  describe('against the real resubmit-reminder files', () => {
    it('finds three stages in each part', () => {
      for (const suffix of ['html', 'subject', 'text']) {
        const src = read(`creator-profile-resubmit-reminder.${suffix}.hbs`);
        expect(splitStageTemplate(src).map((s) => s.stage)).toEqual([1, 2, 3]);
      }
    });
  });
});
