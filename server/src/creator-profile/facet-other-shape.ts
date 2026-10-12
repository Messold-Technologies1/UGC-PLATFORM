/**
 * Shape guards for a free-text "Other" facet value, run before the LLM and
 * again on the label the LLM proposes.
 *
 * Every real option in the catalog is a short descriptor — "Midsize",
 * "Plus Size / Curvy", "Individual / Solo". What creators actually type into
 * the box when they misunderstand it is a note about themselves:
 * "Vaishnavi (Midsize) Manish (Athletic)" was accepted as an Appearance and
 * became a chip every brand could then filter by. A model asked "is this a
 * legitimate appearance?" says yes to that, because it does contain body
 * types. These rules reject it on shape instead, before the question is even
 * asked, and they catch the same thing again if the model proposes it as a
 * new label.
 */

/** Longest a real option label runs, in words. "Plus Size / Curvy" is 4. */
const MAX_WORDS = 4;
const MAX_CHARS = 40;

/**
 * Brackets never appear in an option label and are a reliable tell of a note
 * rather than a value — "(Midsize)", "(Athletic)".
 */
const BRACKETS_RE = /[()[\]{}]/;

/** A value is a descriptor, not a sentence or a list of them. */
const SENTENCE_PUNCTUATION_RE = /[.,;:!?]/;

/** Digits belong to ages, heights and phone numbers, not to a facet label. */
const DIGIT_RE = /\d/;

export type FacetShapeRejection =
  | 'too_long'
  | 'brackets'
  | 'punctuation'
  | 'digits'
  | 'multiple_values';

/**
 * Why this text cannot be a facet value, or null when its shape is fine.
 * Shape only — whether the words mean an appearance or a creator type is the
 * LLM's job.
 */
export function rejectFacetTextShape(
  normalized: string,
): FacetShapeRejection | null {
  const text = normalized.trim();
  if (!text) return 'too_long';

  if (BRACKETS_RE.test(text)) return 'brackets';
  if (DIGIT_RE.test(text)) return 'digits';
  if (SENTENCE_PUNCTUATION_RE.test(text)) return 'punctuation';
  if (text.length > MAX_CHARS) return 'too_long';

  // "/" and "&" join one option's two halves ("Plus Size / Curvy"), so they are
  // not separators here; words are.
  const words = text.split(/\s+/).filter(Boolean);

  // Checked before the word count so the more specific reason wins. Two values
  // joined with a conjunction are two answers to a single-value question — and
  // "Faceless And Face Creator" is how the catalog got an option nobody meant
  // to create.
  const conjunctions = words.filter(
    (word) => word === 'and' || word === '&' || word === '/' || word === '+',
  );
  if (conjunctions.length > 1) return 'multiple_values';

  if (words.length > MAX_WORDS) return 'too_long';

  return null;
}
