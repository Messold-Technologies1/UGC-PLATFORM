/**
 * Splits a stage-switching Handlebars template into one template per stage.
 *
 * Two templates ship as a single file holding several different emails, gated
 * by `{{#if isStage1}}` … `{{#if isStage4}}` — the subject line does the same
 * thing on one line. That works for a code-driven drip, but it means an admin
 * editing the day-3 copy has to scroll a hundred-line file with four nested
 * conditionals and not break the other three.
 *
 * So the seeder splits them. Shared copy outside the blocks (the greeting, the
 * sign-off) is kept on every stage; only the conditional body differs.
 */

export type StageSplit = {
  stage: number;
  content: string;
};

const STAGE_OPEN = /\{\{#if\s+isStage(\d+)\s*\}\}/g;
const IF_CLOSE = '{{/if}}';

/**
 * Pull out each `{{#if isStageN}}…{{/if}}` block along with whatever surrounds
 * them, then recombine as `prefix + block + suffix` per stage.
 *
 * Returns an empty array when the source has no stage blocks, so callers can
 * treat "not a stage template" as the normal case.
 */
export function splitStageTemplate(source: string): StageSplit[] {
  STAGE_OPEN.lastIndex = 0;

  const blocks: { stage: number; start: number; end: number; inner: string }[] =
    [];
  let match: RegExpExecArray | null;

  while ((match = STAGE_OPEN.exec(source)) !== null) {
    const stage = Number(match[1]);
    const innerStart = match.index + match[0].length;
    const closeIndex = source.indexOf(IF_CLOSE, innerStart);
    if (closeIndex === -1) {
      throw new Error(`Unclosed {{#if isStage${stage}}} block`);
    }
    blocks.push({
      stage,
      start: match.index,
      end: closeIndex + IF_CLOSE.length,
      inner: source.slice(innerStart, closeIndex),
    });
    STAGE_OPEN.lastIndex = closeIndex + IF_CLOSE.length;
  }

  if (blocks.length === 0) return [];

  // Anything before the first block and after the last is shared by all stages.
  const prefix = source.slice(0, blocks[0].start);
  const suffix = source.slice(blocks[blocks.length - 1].end);

  return blocks.map(({ stage, inner }) => ({
    stage,
    content: normalise(`${prefix}${inner}${suffix}`),
  }));
}

/** True when the source carries stage switches at all. */
export function hasStageBlocks(source: string): boolean {
  STAGE_OPEN.lastIndex = 0;
  return STAGE_OPEN.test(source);
}

/**
 * Tidy the seams left by removing a block: the separator whitespace that used
 * to sit between stages collapses, and trailing spaces go. Deliberately
 * conservative — it never touches the copy itself.
 */
function normalise(text: string): string {
  const collapsed = stripStageVarsFromComment(text)
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // A single-line source (the subject) should stay on one line.
  return collapsed;
}

/**
 * The html files open with a `{{!-- context: … --}}` comment listing the
 * variables they use. After the split, `isStage1`… are no longer among them, so
 * leaving them listed would send the next editor looking for something that
 * does not exist.
 */
function stripStageVarsFromComment(text: string): string {
  return text.replace(/\{\{!--\s*context:[^}]*--\}\}/, (comment) =>
    comment.replace(/,\s*isStage\d+/g, '').replace(/isStage\d+\s*,\s*/g, ''),
  );
}
