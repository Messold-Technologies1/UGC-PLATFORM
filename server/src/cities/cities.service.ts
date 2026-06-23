import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeLocationName } from './normalize-location';

const COUNTRY = 'IN';

export interface ResolveLocationInput {
  city?: string | null;
  state?: string | null;
}

export interface ResolveLocationResult {
  /** Canonical city name (catalog spelling) or null when unresolved. */
  city: string | null;
  /** Canonical state name (catalog spelling) or null when unresolved. */
  state: string | null;
}

/**
 * Resolves free-typed / LLM-extracted location values to the canonical names
 * stored on creator profiles, so an AI-search hard filter for "Bombay" still
 * matches a creator stored as "Mumbai". Alias-aware (Bombay→Mumbai,
 * Orissa→Odisha) and India-only. Returns null when nothing matches; callers
 * decide whether to fall back to the raw value or drop the filter.
 *
 * Stateless reference lookups — nothing here touches CreatorProfile, so the
 * whole feature can be removed without schema changes.
 */
@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Canonical state name for a typed/extracted value, or null. */
  async resolveStateToCanonical(input: string): Promise<string | null> {
    const norm = normalizeLocationName(input ?? '');
    if (!norm) return null;

    const exact = await this.prisma.state.findFirst({
      where: { countryCode: COUNTRY, name: { equals: input.trim(), mode: 'insensitive' } },
      select: { name: true },
    });
    if (exact) return exact.name;

    const aliased = await this.prisma.state.findFirst({
      where: { countryCode: COUNTRY, aliasesNormalized: { has: norm } },
      select: { name: true },
    });
    return aliased?.name ?? null;
  }

  /**
   * Canonical city name for a typed/extracted value, or null. When
   * `stateCanonical` is provided the lookup is scoped to that state, which
   * disambiguates same-named cities across states.
   */
  async resolveCityToCanonical(
    input: string,
    stateCanonical?: string | null,
  ): Promise<string | null> {
    const norm = normalizeLocationName(input ?? '');
    if (!norm) return null;

    const stateScope = stateCanonical?.trim()
      ? { stateName: stateCanonical.trim() }
      : {};

    const exact = await this.prisma.city.findFirst({
      where: {
        countryCode: COUNTRY,
        ...stateScope,
        name: { equals: input.trim(), mode: 'insensitive' },
      },
      select: { name: true },
    });
    if (exact) return exact.name;

    const aliased = await this.prisma.city.findFirst({
      where: {
        countryCode: COUNTRY,
        ...stateScope,
        aliasesNormalized: { has: norm },
      },
      select: { name: true },
    });
    return aliased?.name ?? null;
  }

  /**
   * Convenience for AI search: resolves state first, then scopes the city
   * lookup to it when possible.
   */
  async resolveLocation(
    input: ResolveLocationInput,
  ): Promise<ResolveLocationResult> {
    const state = input.state
      ? await this.resolveStateToCanonical(input.state)
      : null;
    const city = input.city
      ? await this.resolveCityToCanonical(input.city, state)
      : null;
    return { city, state };
  }
}
