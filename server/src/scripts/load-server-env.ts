import { existsSync, readFileSync } from 'node:fs';

/** Where deploy.sh keeps the server's secrets on the EC2 host. */
const DEFAULT_ENV_FILE = '/etc/gocollab/server.env';

/**
 * Load the server's env file, for scripts run by hand on the host.
 *
 * PM2 gets these because deploy.sh sources the file into its own environment
 * before starting it. An interactive shell does not, so a one-off script run
 * from /opt/gocollab/current fails on `Environment variable not found:
 * DATABASE_URL` -- which looks like a broken script rather than a shell
 * missing its environment.
 *
 * Only fills in what is NOT already set, so an explicit
 * `DATABASE_URL=... npm run ...` still wins and a developer's local .env is
 * never overridden. Does nothing if the file is absent, which is the normal
 * case off the server.
 *
 * Deliberately not dotenv: that is only present transitively, and adding it
 * as a dependency would put package.json out of step with package-lock.json
 * and break `npm ci` on deploy.
 *
 * @returns the file it loaded, or null if it loaded nothing.
 */
export function loadServerEnv(
  file: string = process.env.ENV_FILE ?? DEFAULT_ENV_FILE,
): string | null {
  if (!existsSync(file)) return null;

  let loaded = 0;
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const body = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = body.indexOf('=');
    if (eq <= 0) continue;

    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    // Set already? Leave it: an explicit value on the command line wins.
    if (process.env[key] !== undefined) continue;

    let value = body.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
    loaded += 1;
  }

  return loaded > 0 ? file : null;
}
