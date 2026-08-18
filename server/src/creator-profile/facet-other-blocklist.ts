/**
 * Minimal, fast local guard for obviously abusive free-text before it reaches
 * the LLM (and so it still works when the LLM is unavailable). NOT exhaustive —
 * the AI resolver is the primary content check; this only catches the blatant
 * cases cheaply. Matched on word boundaries against the normalized input.
 */
const BLOCKED_TERMS: readonly string[] = [
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'rape',
  'rapist',
  'porn',
  'nude',
  'nudes',
  'sex',
  'sexy',
  'pedo',
  'pedophile',
  'cunt',
  'dick',
  'pussy',
  'cock',
];

const BLOCKED_RE = new RegExp(
  `\\b(${BLOCKED_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);

/** True when the normalized text contains an obviously inappropriate term. */
export function containsBlockedTerm(normalized: string): boolean {
  return BLOCKED_RE.test(normalized);
}
