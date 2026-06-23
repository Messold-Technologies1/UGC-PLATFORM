import { writeFileSync } from 'fs';
import { join } from 'path';
// Default import + destructure so this runs under both CommonJS and ESM ts-node.
import csc from 'country-state-city';

const { State } = csc;

/**
 * One-off DEV generator for broad city/state alias coverage.
 *
 * Source: https://github.com/sandeepbaid/indian-cities-states-list (Wikipedia-
 * sourced alternate names). We use this rather than GeoNames because GeoNames'
 * direct download (download.geonames.org) is blocked by the sandbox/CI network
 * policy, and its raw `alternatenames` column is noisy (native scripts, postal
 * codes). This dataset is pre-curated, ASCII, and keys places by ISO code that
 * maps 1:1 to the country-state-city catalog the seed is built on.
 *
 * Output: committed JSON alias GROUPS (same shape the seed consumes), so the
 * seed stays offline/self-contained on Railway. Re-run with:
 *   npx ts-node prisma/scripts/generate-india-location-aliases.ts
 * Curated overrides in prisma/data/india-location-aliases.json are merged on top
 * by the seed (unioned), so hand-fixes always survive a regenerate.
 */

const CITIES_URL =
  'https://raw.githubusercontent.com/sandeepbaid/indian-cities-states-list/master/src/cities.csv';
const STATES_URL =
  'https://raw.githubusercontent.com/sandeepbaid/indian-cities-states-list/master/src/states.csv';

// process.cwd() (server root when run via npm) rather than __dirname, which is
// undefined under ESM ts-node.
const DATA_DIR = join(process.cwd(), 'prisma', 'data');

/** Parse one CSV line, honoring double-quoted fields with embedded commas. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

function splitAliases(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface CityAliasGroup {
  state: string;
  names: string[];
}

async function main(): Promise<void> {
  // ISO code -> canonical state name, from the same catalog the seed uses.
  const isoToStateName = new Map<string, string>();
  for (const st of State.getStatesOfCountry('IN')) {
    isoToStateName.set(st.isoCode.toUpperCase(), st.name);
  }

  // --- Cities ---
  const citiesCsv = await fetchText(CITIES_URL);
  const cityLines = citiesCsv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cityGroups: CityAliasGroup[] = [];
  let cityUnmappedState = 0;

  for (const line of cityLines) {
    const cols = parseCsvLine(line);
    // cols: id,name,altNames,areaCode,lat,lng,altitude,population,district,stateISO
    const name = cols[1];
    const aliases = splitAliases(cols[2] ?? '');
    const stateIso = (cols[9] ?? '').toUpperCase();
    if (!name || aliases.length === 0) continue;

    const stateName = isoToStateName.get(stateIso);
    if (!stateName) {
      cityUnmappedState += 1;
      continue;
    }
    cityGroups.push({ state: stateName, names: [name, ...aliases] });
  }

  // --- States ---
  const statesCsv = await fetchText(STATES_URL);
  const stateLines = statesCsv
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  const stateGroups: string[][] = [];

  for (const line of stateLines) {
    const cols = parseCsvLine(line);
    // cols: id,countryISO,stateISO,name,altName,type,capital
    const name = cols[3];
    const aliases = splitAliases(cols[4] ?? '');
    if (!name || aliases.length === 0) continue;
    stateGroups.push([name, ...aliases]);
  }

  writeFileSync(
    join(DATA_DIR, 'india-city-aliases.generated.json'),
    JSON.stringify(cityGroups, null, 2) + '\n',
  );
  writeFileSync(
    join(DATA_DIR, 'india-state-aliases.generated.json'),
    JSON.stringify(stateGroups, null, 2) + '\n',
  );

  console.log(
    `[gen-aliases] wrote ${cityGroups.length} city groups, ${stateGroups.length} state groups` +
      (cityUnmappedState
        ? ` (${cityUnmappedState} cities skipped: unmapped state ISO)`
        : ''),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
