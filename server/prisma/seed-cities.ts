import { PrismaClient } from '@prisma/client';
import { City, State } from 'country-state-city';
import {
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

  // --- Attach state aliases ---
  let stateAliasUpdates = 0;
  for (const group of STATE_ALIAS_GROUPS) {
    const present = group.filter((n) => stateNameSet.has(n));
    if (present.length === 0) {
      console.warn(
        `[seed-cities] state alias group has no catalog match: ${group.join(' | ')}`,
      );
      continue;
    }
    for (const canonical of present) {
      const aliases = dedupeNormalized(
        group.filter((n) => n !== canonical),
      );
      await prisma.state.update({
        where: { countryCode_name: { countryCode: COUNTRY, name: canonical } },
        data: { aliasesNormalized: aliases },
      });
      stateAliasUpdates += 1;
    }
  }

  // --- Attach city aliases ---
  let cityAliasUpdates = 0;
  for (const group of CITY_ALIAS_GROUPS) {
    const stateCities = citiesByState.get(group.state);
    if (!stateCities) {
      console.warn(
        `[seed-cities] city alias group references unknown state "${group.state}": ${group.names.join(' | ')}`,
      );
      continue;
    }
    const present = group.names.filter((n) => stateCities.has(n));
    if (present.length === 0) {
      console.warn(
        `[seed-cities] city alias group has no catalog match in ${group.state}: ${group.names.join(' | ')}`,
      );
      continue;
    }
    for (const canonical of present) {
      const aliases = dedupeNormalized(
        group.names.filter((n) => n !== canonical),
      );
      await prisma.city.update({
        where: {
          countryCode_stateName_name: {
            countryCode: COUNTRY,
            stateName: group.state,
            name: canonical,
          },
        },
        data: { aliasesNormalized: aliases },
      });
      cityAliasUpdates += 1;
    }
  }

  console.log(
    `[seed-cities] applied aliases to ${stateAliasUpdates} states, ${cityAliasUpdates} cities`,
  );
}

function dedupeNormalized(names: string[]): string[] {
  return Array.from(new Set(names.map(normalize)));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
