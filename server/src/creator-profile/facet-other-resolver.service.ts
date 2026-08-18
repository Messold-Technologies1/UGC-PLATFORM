import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreatorFacetDimension } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient, OpenRouterError } from '../ai/openrouter.client';
import { ConfigService } from '@nestjs/config';
import { containsBlockedTerm } from './facet-other-blocklist';
import type {
  FacetOtherResolveResponseDto,
  ResolvedFacetOptionDto,
} from './dto/resolve-facet-other.dto';

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

  async resolve(
    userId: string | null,
    dimension: CreatorFacetDimension,
    rawText: string,
  ): Promise<FacetOtherResolveResponseDto> {
    if (!RESOLVABLE_DIMENSIONS.has(dimension)) {
      throw new BadRequestException(
        `The "Other" resolver does not support ${dimension}.`,
      );
    }

    // Best-effort provenance for auto-added options (no hard dependency).
    const creator = userId
      ? await this.prisma.creatorProfile.findUnique({
          where: { userId },
          select: { id: true },
        })
      : null;
    const creatorProfileId = creator?.id ?? null;

    const typedText = rawText.trim().slice(0, 60);
    const normalized = this.normalize(typedText);

    // Tier 0 — format + blocklist guards.
    if (normalized.length < 2 || !/[a-z]/.test(normalized)) {
      return this.rejected(typedText, 'invalid');
    }
    if (containsBlockedTerm(normalized)) {
      this.logger.warn(
        `facet_other blocked term dimension=${dimension} creator=${creatorProfileId ?? 'n/a'}`,
      );
      return this.rejected(typedText, 'inappropriate');
    }

    // Tier 1 — learned alias cache (no AI).
    const alias = await this.prisma.creatorFacetOptionAlias.findUnique({
      where: { dimension_normalizedText: { dimension, normalizedText: normalized } },
      include: { option: true },
    });
    if (alias?.option && alias.option.status === 'active') {
      return this.matched(typedText, dimension, alias.option);
    }

    // Load active options once (small catalog) for exact match + the LLM prompt.
    const activeOptions = await this.prisma.creatorFacetOption.findMany({
      where: { dimension, status: 'active' },
      select: { id: true, slug: true, label: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Tier 2a — exact match on label/slug.
    const exact = activeOptions.find(
      (o) =>
        o.slug !== 'other' &&
        (this.normalize(o.label) === normalized || o.slug === this.slugify(normalized)),
    );
    if (exact) {
      await this.writeAlias(dimension, normalized, exact.id, 'exact');
      return this.matched(typedText, dimension, exact);
    }

    // Tier 2b — fuzzy (pg_trgm) match.
    const fuzzy = await this.fuzzyMatch(dimension, normalized);
    if (fuzzy && fuzzy.slug !== 'other') {
      await this.writeAlias(dimension, normalized, fuzzy.id, 'fuzzy');
      return this.matched(typedText, dimension, fuzzy);
    }

    // Tier 3 — LLM. If unavailable, keep the value as private custom text.
    if (!this.openRouter.isConfigured()) {
      return this.kept(typedText);
    }
    let decision: LlmDecision | null;
    try {
      decision = await this.classifyWithLlm(dimension, typedText, activeOptions);
    } catch (err) {
      this.logger.warn(
        `facet_other llm failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.kept(typedText);
    }
    if (!decision) return this.kept(typedText);

    if (decision.action === 'reject') {
      return this.rejected(
        typedText,
        decision.reason === 'inappropriate' ? 'inappropriate' : 'invalid',
      );
    }

    if (decision.action === 'match' && decision.slug) {
      const matchOpt = activeOptions.find((o) => o.slug === decision.slug);
      if (matchOpt) {
        await this.writeAlias(dimension, normalized, matchOpt.id, 'llm');
        return this.matched(typedText, dimension, matchOpt);
      }
      // Model named a slug we don't have — fall through to treat as new.
    }

    // action === 'new' (or an unmatched 'match'): add it to the catalog.
    const label = this.titleCase(decision.label || typedText);
    const created = await this.createOption(
      dimension,
      label,
      creatorProfileId,
      activeOptions,
    );
    await this.writeAlias(dimension, normalized, created.id, 'llm');
    return {
      action: 'created',
      typedText,
      option: { dimension, slug: created.slug, label: created.label },
      message: `Added "${created.label}" — other creators can pick it too.`,
    };
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
    activeOptions: Array<{ slug: string }>,
  ): Promise<{ id: string; slug: string; label: string }> {
    let baseSlug = this.slugify(label);
    if (!baseSlug || baseSlug === 'other') baseSlug = `custom_${this.slugify(label)}`;

    // Ensure a unique slug within the dimension.
    const existingSlugs = new Set(activeOptions.map((o) => o.slug));
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

  private matched(
    typedText: string,
    dimension: CreatorFacetDimension,
    option: { slug: string; label: string },
  ): FacetOtherResolveResponseDto {
    const opt: ResolvedFacetOptionDto = {
      dimension,
      slug: option.slug,
      label: option.label,
    };
    return {
      action: 'match',
      typedText,
      option: opt,
      message: `"${typedText}" is the same as "${option.label}" — we selected it for you.`,
    };
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
