import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { City, State } from 'country-state-city';
import {
  CityAliasGroup,
  CITY_ALIAS_GROUPS,
  STATE_ALIAS_GROUPS,
} from './data/india-location-aliases';

const prisma = new PrismaClient();
const COUNTRY = 'IN';

/** Same normalization the resolver uses: trim, lowercase, collapse whitespace. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dbFingerprint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL=<missing>';
  try {
    const u = new URL(url);
    return `host=${u.host} db=${u.pathname.replace(/^\//, '') || '<no-db>'}`;
  } catch {
    return 'DATABASE_URL=<unparseable>';
  }
}

/**
 * Seeds canonical Indian states + cities from the `country-state-city` catalog
 * (the same vocabulary creators select at signup), then attaches alias spellings
 * from the bidirectional groups. Idempotent: re-running upserts/overwrites rows
 * without creating duplicates.
 */
async function main(): Promise<void> {
  console.log(`[seed-cities] target ${dbFingerprint()}`);

  const states = State.getStatesOfCountry(COUNTRY);
  if (states.length === 0) {
    throw new Error('country-state-city returned no states for IN');
  }

  // In-memory catalog snapshot, used to decide which alias-group members exist.
  const stateNameSet = new Set<string>();
  const citiesByState = new Map<string, Set<string>>();

  let stateCount = 0;
  let cityCount = 0;

  for (const st of states) {
    stateNameSet.add(st.name);

    const stateRow = await prisma.state.upsert({
      where: { countryCode_name: { countryCode: COUNTRY, name: st.name } },
      create: { name: st.name, countryCode: COUNTRY, aliasesNormalized: [] },
      update: {},
      select: { id: true },
    });
    stateCount += 1;

    const cities = City.getCitiesOfState(COUNTRY, st.isoCode);
    // Dedupe within a state (the catalog occasionally repeats a name).
    const uniqueCityNames = Array.from(new Set(cities.map((c) => c.name)));
    citiesByState.set(st.name, new Set(uniqueCityNames));

    if (uniqueCityNames.length > 0) {
      const result = await prisma.city.createMany({
        data: uniqueCityNames.map((name) => ({
          name,
          stateId: stateRow.id,
          stateName: st.name,
          countryCode: COUNTRY,
          aliasesNormalized: [],
        })),
        skipDuplicates: true,
      });
      cityCount += result.count;
    }
  }

  console.log(
    `[seed-cities] upserted ${stateCount} states, inserted ${cityCount} new cities`,
  );

  // Merge hand-curated groups (authoritative) with the broad generated dataset.
  // Union semantics below mean a place accumulates aliases from EVERY group that
  // names it, so regenerating the dataset never drops a curated alias and the
  // two sources reinforce each other instead of overwriting.
  const generatedStateGroups = loadGeneratedGroups<string[][]>(
    'india-state-aliases.generated.json',
  );
  const generatedCityGroups = loadGeneratedGroups<CityAliasGroup[]>(
    'india-city-aliases.generated.json',
  );

  const allStateGroups = [...STATE_ALIAS_GROUPS, ...generatedStateGroups];
  const allCityGroups = [...CITY_ALIAS_GROUPS, ...generatedCityGroups];

  // --- State aliases (union per canonical catalog name) ---
  const stateAliasByName = new Map<string, Set<string>>();
  let stateGroupsUnmatched = 0;
  for (const group of allStateGroups) {
    const present = group.filter((n) => stateNameSet.has(n));
    if (present.length === 0) {
      stateGroupsUnmatched += 1;
      continue;
    }
    for (const canonical of present) {
      const set = stateAliasByName.get(canonical) ?? new Set<string>();
      for (const alias of normalizedOthers(group, canonical)) set.add(alias);
      stateAliasByName.set(canonical, set);
    }
  }
  for (const [name, set] of stateAliasByName) {
    await prisma.state.update({
      where: { countryCode_name: { countryCode: COUNTRY, name } },
      data: { aliasesNormalized: Array.from(set) },
    });
  }

  // --- City aliases (union per canonical catalog name, scoped by state) ---
  const cityAliasByKey = new Map<
    string,
    { stateName: string; name: string; set: Set<string> }
  >();
  let cityGroupsUnmatched = 0;
  for (const group of allCityGroups) {
    const stateCities = citiesByState.get(group.state);
    if (!stateCities) {
      cityGroupsUnmatched += 1;
      continue;
    }
    const present = group.names.filter((n) => stateCities.has(n));
    if (present.length === 0) {
      cityGroupsUnmatched += 1;
      continue;
    }
    for (const canonical of present) {
      const key = `${group.state} ${canonical}`;
      const entry = cityAliasByKey.get(key) ?? {
        stateName: group.state,
        name: canonical,
        set: new Set<string>(),
      };
      for (const alias of normalizedOthers(group.names, canonical)) {
        entry.set.add(alias);
      }
      cityAliasByKey.set(key, entry);
    }
  }
  for (const { stateName, name, set } of cityAliasByKey.values()) {
    await prisma.city.update({
      where: {
        countryCode_stateName_name: {
          countryCode: COUNTRY,
          stateName,
          name,
        },
      },
      data: { aliasesNormalized: Array.from(set) },
    });
  }

  console.log(
    `[seed-cities] aliases applied to ${stateAliasByName.size} states, ` +
      `${cityAliasByKey.size} cities (curated ${STATE_ALIAS_GROUPS.length}/${CITY_ALIAS_GROUPS.length} ` +
      `+ generated ${generatedStateGroups.length}/${generatedCityGroups.length}; ` +
      `${stateGroupsUnmatched}/${cityGroupsUnmatched} groups unmatched)`,
  );
}

/** Lowercased aliases for a group, excluding the canonical member itself. */
function normalizedOthers(members: string[], canonical: string): string[] {
  const canon = normalize(canonical);
  return Array.from(
    new Set(members.map(normalize).filter((n) => n !== canon)),
  );
}

/**
 * Loads a committed generated-alias file. Returns an empty list (with a warning)
 * when absent, so the seed still runs on the curated groups alone — e.g. before
 * anyone runs prisma/scripts/generate-india-location-aliases.ts.
 */
function loadGeneratedGroups<T>(fileName: string): T {
  const path = join(__dirname, 'data', fileName);
  if (!existsSync(path)) {
    console.warn(`[seed-cities] generated alias file missing: ${fileName}`);
    return [] as unknown as T;
  }
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
