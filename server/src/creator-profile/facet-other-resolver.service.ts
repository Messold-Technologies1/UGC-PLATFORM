import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreatorFacetDimension } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient, OpenRouterError } from '../ai/openrouter.client';
import { ConfigService } from '@nestjs/config';
import { containsBlockedTerm } from './facet-other-blocklist';
import type { FacetOtherResolveResponseDto } from './dto/resolve-facet-other.dto';

/** Trigram similarity above which a typed value is treated as an existing option. */
const FUZZY_THRESHOLD = 0.6;
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';

/** Dimensions the "Other" resolver supports (LANGUAGE is a separate flow). */
const RESOLVABLE_DIMENSIONS = new Set<CreatorFacetDimension>([
  CreatorFacetDimension.CONTENT_CATEGORY,
  CreatorFacetDimension.CREATOR_TYPE,
  CreatorFacetDimension.OCCUPATION,
  CreatorFacetDimension.APPEARANCE,
]);

const DIMENSION_NOUN: Record<string, string> = {
  CONTENT_CATEGORY: 'content niche / category',
  CREATOR_TYPE: 'creator type',
  OCCUPATION: 'occupation',
  APPEARANCE: 'physical appearance / body type',
};

interface LlmDecision {
  action: 'match' | 'new' | 'reject';
  slug?: string;
  label?: string;
  reason?: 'inappropriate' | 'invalid';
}

type CoreDecision =
  | { kind: 'match'; option: { id: string; slug: string; label: string } }
  | { kind: 'new'; label: string }
  | { kind: 'reject'; reason: 'inappropriate' | 'invalid' }
  | { kind: 'kept' };

/**
 * Canonicalizes a creator's free-text "Other" facet value against the catalog.
 *
 * Tiered so most inputs never hit the LLM:
 *   0. normalize + cheap format/blocklist guards
 *   1. alias cache (a learned synonym -> option map; populated by every match)
 *   2. exact + pg_trgm fuzzy match against active options
 *   3. LLM classify: synonym of an existing option, a new valid value, or reject
 *
 * A valid new value is auto-added to the catalog as an active option so other
 * creators can pick it. Inappropriate/gibberish input is rejected (never added).
 */
@Injectable()
export class FacetOtherResolverService {
  private readonly logger = new Logger(FacetOtherResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openRouter: OpenRouterClient,
    private readonly config: ConfigService,
  ) {}

  private normalize(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  }

  private titleCase(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ')
      .slice(0, 40);
  }

  /**
   * READ-ONLY classification for the wizard's live "Other" check. Never writes:
   * no catalog option is created and no alias is stored here. The actual writes
   * happen only when the creator saves the profile
   * ({@link resolveSelectionsForPersist}), so tabbing out of the box never
   * mutates shared data.
   */
  async classify(
    dimension: CreatorFacetDimension,
    rawText: string,
  ): Promise<FacetOtherResolveResponseDto> {
    if (!RESOLVABLE_DIMENSIONS.has(dimension)) {
      throw new BadRequestException(
        `The "Other" resolver does not support ${dimension}.`,
      );
    }
    const typedText = rawText.trim().slice(0, 60);
    const core = await this.classifyCore(dimension, typedText);

    switch (core.kind) {
      case 'match':
        return {
          action: 'match',
          typedText,
          option: {
            dimension,
            slug: core.option.slug,
            label: core.option.label,
          },
          message: `"${typedText}" is the same as "${core.option.label}" — we selected it for you.`,
        };
      case 'new':
        return {
          action: 'new',
          typedText,
          label: core.label,
          message: `We'll add "${core.label}" to the list when you save.`,
        };
      case 'reject':
        return this.rejected(typedText, core.reason);
      case 'kept':
      default:
        return this.kept(typedText);
    }
  }

  /**
   * Resolve every free-text "Other" selection to a canonical option AT SAVE
   * TIME. This is the only path that writes to the shared catalog (creating a
   * new option) and the alias cache. Call it BEFORE opening the save
   * transaction (it makes network/LLM calls). Returns a new selection list with
   * "Other" entries replaced by real slugs, kept as generic "Other" (AI
   * unavailable), or dropped (rejected).
   */
  async resolveSelectionsForPersist(
    creatorProfileId: string | null,
    selections: Array<{
      dimension: CreatorFacetDimension;
      slug: string;
      rank?: number;
      customLabel?: string;
    }>,
  ): Promise<
    Array<{
      dimension: CreatorFacetDimension;
      slug: string;
      rank?: number;
      customLabel?: string;
    }>
  > {
    const out: Array<{
      dimension: CreatorFacetDimension;
      slug: string;
      rank?: number;
      customLabel?: string;
    }> = [];

    for (const sel of selections) {
      if (sel.slug !== 'other') {
        out.push(sel);
        continue;
      }
      const text = (sel.customLabel ?? '').trim();
      if (!text || !RESOLVABLE_DIMENSIONS.has(sel.dimension)) continue; // drop blank

      const resolved = await this.resolveOneForPersist(
        creatorProfileId,
        sel.dimension,
        text,
      );
      if (!resolved) continue; // rejected -> drop
      if ('keepOther' in resolved) {
        // AI unavailable: keep the generic "other" option + the typed label.
        out.push(sel);
        continue;
      }
      // Real (matched or newly created) option; the custom label is no longer
      // needed because the value is now a first-class catalog option.
      out.push({ dimension: sel.dimension, slug: resolved.slug, rank: sel.rank });
    }
    return out;
  }

  private async resolveOneForPersist(
    creatorProfileId: string | null,
    dimension: CreatorFacetDimension,
    text: string,
  ): Promise<{ slug: string } | { keepOther: true } | null> {
    const typedText = text.trim().slice(0, 60);
    const normalized = this.normalize(typedText);
    const core = await this.classifyCore(dimension, typedText);

    switch (core.kind) {
      case 'match':
        await this.writeAlias(dimension, normalized, core.option.id, 'match');
        return { slug: core.option.slug };
      case 'new': {
        const created = await this.createOption(
          dimension,
          core.label,
          creatorProfileId,
        );
        await this.writeAlias(dimension, normalized, created.id, 'llm');
        return { slug: created.slug };
      }
      case 'reject':
        return null;
      case 'kept':
      default:
        return { keepOther: true };
    }
  }

  /**
   * The shared, side-effect-free classification pipeline: normalize + guards ->
   * alias cache -> exact/fuzzy match -> LLM. Returns a decision; callers decide
   * whether to persist anything.
   */
  private async classifyCore(
    dimension: CreatorFacetDimension,
    typedText: string,
  ): Promise<CoreDecision> {
    const normalized = this.normalize(typedText);

    // Tier 0 — format + blocklist guards.
    if (normalized.length < 2 || !/[a-z]/.test(normalized)) {
      return { kind: 'reject', reason: 'invalid' };
    }
    if (containsBlockedTerm(normalized)) {
      this.logger.warn(`facet_other blocked term dimension=${dimension}`);
      return { kind: 'reject', reason: 'inappropriate' };
    }

    // Tier 1 — learned alias cache.
    const alias = await this.prisma.creatorFacetOptionAlias.findUnique({
      where: { dimension_normalizedText: { dimension, normalizedText: normalized } },
      include: { option: true },
    });
    if (alias?.option && alias.option.status === 'active') {
      return { kind: 'match', option: alias.option };
    }

    // Load active options once for exact match + the LLM prompt.
    const activeOptions = await this.prisma.creatorFacetOption.findMany({
      where: { dimension, status: 'active' },
      select: { id: true, slug: true, label: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Tier 2a — exact match on label/slug.
    const exact = activeOptions.find(
      (o) =>
        o.slug !== 'other' &&
        (this.normalize(o.label) === normalized ||
          o.slug === this.slugify(normalized)),
    );
    if (exact) return { kind: 'match', option: exact };

    // Tier 2b — fuzzy (pg_trgm) match.
    const fuzzy = await this.fuzzyMatch(dimension, normalized);
    if (fuzzy && fuzzy.slug !== 'other') return { kind: 'match', option: fuzzy };

    // Tier 3 — LLM. If unavailable, keep the value as private custom text.
    if (!this.openRouter.isConfigured()) return { kind: 'kept' };
    let decision: LlmDecision | null;
    try {
      decision = await this.classifyWithLlm(dimension, typedText, activeOptions);
    } catch (err) {
      this.logger.warn(
        `facet_other llm failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { kind: 'kept' };
    }
    if (!decision) return { kind: 'kept' };

    if (decision.action === 'reject') {
      return {
        kind: 'reject',
        reason: decision.reason === 'inappropriate' ? 'inappropriate' : 'invalid',
      };
    }
    if (decision.action === 'match' && decision.slug) {
      const matchOpt = activeOptions.find((o) => o.slug === decision.slug);
      if (matchOpt) return { kind: 'match', option: matchOpt };
      // Model named a slug we don't have — fall through to treat as new.
    }
    return { kind: 'new', label: this.titleCase(decision.label || typedText) };
  }

  private async fuzzyMatch(
    dimension: CreatorFacetDimension,
    normalized: string,
  ): Promise<{ id: string; slug: string; label: string } | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; slug: string; label: string; sim: number }>
    >`
      SELECT "id", "slug", "label", similarity(lower("label"), ${normalized}) AS sim
      FROM "CreatorFacetOption"
      WHERE "dimension" = ${dimension}::"CreatorFacetDimension"
        AND "status" = 'active'
      ORDER BY sim DESC
      LIMIT 1
    `;
    const top = rows[0];
    return top && top.sim >= FUZZY_THRESHOLD
      ? { id: top.id, slug: top.slug, label: top.label }
      : null;
  }

  private async createOption(
    dimension: CreatorFacetDimension,
    label: string,
    creatorProfileId: string | null,
  ): Promise<{ id: string; slug: string; label: string }> {
    let baseSlug = this.slugify(label);
    if (!baseSlug || baseSlug === 'other') baseSlug = `custom_${this.slugify(label)}`;

    // Ensure a unique slug within the dimension.
    const all = await this.prisma.creatorFacetOption.findMany({
      where: { dimension },
      select: { slug: true },
    });
    const existingSlugs = new Set(all.map((o) => o.slug));
    let slug = baseSlug;
    let n = 2;
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}_${n++}`.slice(0, 40);
    }

    const agg = await this.prisma.creatorFacetOption.aggregate({
      where: { dimension },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? 0) + 1;

    // Upsert guards against a concurrent identical insert (unique dimension+slug).
    const option = await this.prisma.creatorFacetOption.upsert({
      where: { dimension_slug: { dimension, slug } },
      update: { status: 'active' },
      create: {
        dimension,
        slug,
        label,
        sortOrder,
        status: 'active',
        proposedByCreatorId: creatorProfileId,
      },
      select: { id: true, slug: true, label: true },
    });
    this.logger.log(
      `facet_other created dimension=${dimension} slug=${option.slug} label="${option.label}"`,
    );
    return option;
  }

  private async classifyWithLlm(
    dimension: CreatorFacetDimension,
    typedText: string,
    options: Array<{ slug: string; label: string }>,
  ): Promise<LlmDecision | null> {
    const noun = DIMENSION_NOUN[dimension] ?? 'value';
    const list = options
      .filter((o) => o.slug !== 'other')
      .map((o) => `- ${o.slug}: ${o.label}`)
      .join('\n');

    const system = `You canonicalize a free-text value a creator typed into an "Other" box for the "${noun}" field on a UGC creator marketplace. Decide ONE of:
- It means the same as an existing option (a synonym, abbreviation, misspelling, or regional variant) -> {"action":"match","slug":"<existing slug>"}.
- It is a legitimate, distinct, safe ${noun} not already in the list -> {"action":"new","label":"<corrected, properly capitalized label>"}.
- It is offensive, hateful, sexual, harassing, or a slur -> {"action":"reject","reason":"inappropriate"}.
- It is gibberish, nonsense, or not a real ${noun} -> {"action":"reject","reason":"invalid"}.
Reply with STRICT JSON only, no prose, no code fences.`;

    const user = `Existing options:\n${list || '(none)'}\n\nCreator typed: "${typedText}"\n\nJSON:`;

    const model = this.config.get<string>('OPENROUTER_BIO_MODEL', DEFAULT_MODEL);
    let raw: string;
    try {
      raw = await this.openRouter.chatComplete({
        model,
        system,
        user,
        temperature: 0.1,
        maxTokens: 120,
      });
    } catch (err) {
      if (err instanceof OpenRouterError) throw err;
      throw err;
    }
    return this.parseDecision(raw);
  }

  private parseDecision(raw: string): LlmDecision | null {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const action = parsed.action;
      if (action === 'match' && typeof parsed.slug === 'string') {
        return { action: 'match', slug: parsed.slug };
      }
      if (action === 'new' && typeof parsed.label === 'string') {
        return { action: 'new', label: parsed.label };
      }
      if (action === 'reject') {
        return {
          action: 'reject',
          reason: parsed.reason === 'inappropriate' ? 'inappropriate' : 'invalid',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async writeAlias(
    dimension: CreatorFacetDimension,
    normalizedText: string,
    optionId: string,
    source: string,
  ): Promise<void> {
    await this.prisma.creatorFacetOptionAlias
      .upsert({
        where: { dimension_normalizedText: { dimension, normalizedText } },
        update: { optionId, source },
        create: { dimension, normalizedText, optionId, source },
      })
      .catch(() => undefined);
  }

  private rejected(
    typedText: string,
    reason: 'inappropriate' | 'invalid',
  ): FacetOtherResolveResponseDto {
    return {
      action: 'rejected',
      typedText,
      reason,
      message:
        reason === 'inappropriate'
          ? "That term isn't allowed. Please choose from the list or enter something else."
          : "We couldn't recognize that — try rephrasing or pick from the list.",
    };
  }

  private kept(typedText: string): FacetOtherResolveResponseDto {
    return { action: 'kept', typedText };
  }
}
