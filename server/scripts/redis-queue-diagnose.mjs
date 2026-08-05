/**
 * Redis / BullMQ queue diagnostic.
 *
 * Read-only by default: inspects the managed Redis and the two app queues to
 * explain why an in-process BullMQ worker might fail to consume jobs (jobs stay
 * in `wait`, never go `active`). Safe to run against production.
 *
 * With --idle-test it additionally spins up a throwaway worker on an isolated
 * diagnostic queue, sits idle, then enqueues one job and measures how long it
 * takes to reach `active` — this reproduces the "idle blocking-connection drop"
 * failure mode against the real Redis without touching app queues.
 *
 * Usage (run from server/, deps resolved from server/node_modules):
 *   node scripts/redis-queue-diagnose.mjs --url "$REDIS_URL"
 *   node scripts/redis-queue-diagnose.mjs --url "$REDIS_URL" --idle-test=120
 *
 *   --url <redisUrl>     Redis URL (redis:// or rediss://). Falls back to $REDIS_URL.
 *   --queues a,b         App queue names to inspect. Default: social-metrics-sync,delivery-watermark
 *   --idle-test[=secs]   Also run the idle→enqueue→consume test (default 60s idle).
 */
import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';

function parseArgs(argv) {
  const args = { queues: ['social-metrics-sync', 'delivery-watermark'] };
  for (const a of argv.slice(2)) {
    if (a === '--url') continue;
    if (a.startsWith('--url=')) args.url = a.slice(6);
    else if (!a.startsWith('--') && !args.url) args.url = a; // positional after --url
    else if (a.startsWith('--queues=')) args.queues = a.slice(9).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--idle-test') args.idleTest = 60;
    else if (a.startsWith('--idle-test=')) args.idleTest = Number(a.slice(12)) || 60;
  }
  // support space-separated `--url <value>` and `--queues <value>`
  const i = argv.indexOf('--url');
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) args.url = argv[i + 1];
  const j = argv.indexOf('--queues');
  if (j !== -1 && argv[j + 1] && !argv[j + 1].startsWith('--')) {
    args.queues = argv[j + 1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  args.url = args.url || process.env.REDIS_URL;
  return args;
}

// Mirror the app's buildBullmqConnection, but parse the URL into explicit
// host/port/auth so BullMQ (which manages its own connections) targets the
// right server. Returning bare tuning options without host/port would make it
// silently fall back to localhost:6379.
function connOpts(url) {
  const u = new URL(url);
  const opts = {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 5_000)),
  };
  if (url.startsWith('rediss://')) opts.tls = { rejectUnauthorized: false };
  return opts;
}

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m' };
const ok = (m) => console.log(`${C.green}✓${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}⚠${C.reset}  ${m}`);
const bad = (m) => console.log(`${C.red}✗${C.reset} ${m}`);
const head = (m) => console.log(`\n${C.bold}${m}${C.reset}`);

function parseInfo(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0 && !line.startsWith('#')) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.url) {
    bad('No Redis URL. Pass --url "$REDIS_URL" or set REDIS_URL.');
    process.exit(2);
  }
  // Hard safety net: never let the diagnostic hang forever.
  const hardTimeoutMs = (args.idleTest ? args.idleTest * 1000 : 0) + 60_000;
  const guard = setTimeout(() => {
    console.error(`\n${C.red}Diagnostic timed out after ${Math.round(hardTimeoutMs / 1000)}s — aborting.${C.reset}`);
    process.exit(3);
  }, hardTimeoutMs);
  guard.unref();

  const findings = [];
  const redacted = args.url.replace(/(:\/\/[^:]*:)[^@]*(@)/, '$1***$2');
  console.log(`${C.bold}Redis/BullMQ diagnostic${C.reset} ${C.dim}${redacted}${C.reset}`);

  const client = new IORedis(args.url, connOpts(args.url));
  client.on('error', (e) => console.log(`${C.dim}[redis error] ${e.message}${C.reset}`));
  try {
    await client.ping();
    ok('Connected + PING');
  } catch (e) {
    bad(`Cannot connect: ${e.message}`);
    process.exit(2);
  }

  // ---- 1. Eviction policy (BullMQ requires noeviction) --------------------
  head('1. Memory / eviction policy');
  try {
    const [, policy] = await client.config('GET', 'maxmemory-policy');
    const info = parseInfo(await client.info('stats'));
    const mem = parseInfo(await client.info('memory'));
    const evicted = Number(info.evicted_keys || 0);
    if (policy === 'noeviction') ok(`maxmemory-policy = noeviction`);
    else {
      bad(`maxmemory-policy = ${policy} — BullMQ REQUIRES noeviction; keys can be evicted and jobs get stuck/lost`);
      findings.push(`Set maxmemory-policy to noeviction (currently ${policy}).`);
    }
    console.log(`  used_memory_human=${mem.used_memory_human} maxmemory_human=${mem.maxmemory_human || '0 (unbounded)'} evicted_keys=${evicted}`);
    if (evicted > 0) {
      bad(`evicted_keys=${evicted} — Redis IS evicting keys. This corrupts BullMQ state.`);
      findings.push(`evicted_keys>0: increase memory or reduce retained job history (removeOnComplete/removeOnFail).`);
    }
  } catch (e) {
    warn(`Could not read config/stats (managed Redis may block CONFIG GET): ${e.message}`);
  }

  // ---- 2. Client connections / limits -------------------------------------
  head('2. Client connections');
  try {
    const clients = parseInfo(await client.info('clients'));
    let maxclients = '?';
    try { const [, mc] = await client.config('GET', 'maxclients'); maxclients = mc; } catch { /* blocked on managed */ }
    const connected = Number(clients.connected_clients || 0);
    const blocked = Number(clients.blocked_clients || 0);
    console.log(`  connected_clients=${connected} blocked_clients=${blocked} maxclients=${maxclients}`);
    ok(`blocked_clients=${blocked} (each healthy worker parks 1 blocking connection here while idle)`);
    if (maxclients !== '?' && connected >= Number(maxclients) * 0.85) {
      bad(`connected_clients near maxclients — new blocking connections may be refused (workers can't consume).`);
      findings.push(`Near connection cap: consolidate connections / fewer replicas / bigger plan.`);
    }
  } catch (e) {
    warn(`Could not read client info: ${e.message}`);
  }

  // ---- 3. Blocking consumers via CLIENT LIST ------------------------------
  head('3. Blocking consumers (CLIENT LIST)');
  try {
    const list = await client.client('LIST');
    const lines = list.split('\n').filter(Boolean);
    const blockingCmds = /cmd=(bzpopmin|brpoplpush|blmpop|bzmpop|blpop|brpop|xread)/i;
    const blockers = lines.filter((l) => blockingCmds.test(l) || / flags=\S*b/.test(l));
    if (blockers.length > 0) {
      ok(`${blockers.length} blocking consumer connection(s) parked (workers are waiting for jobs):`);
      for (const b of blockers.slice(0, 8)) {
        const cmd = (b.match(/cmd=(\S+)/) || [])[1];
        const name = (b.match(/name=(\S+)/) || [])[1] || '(unnamed)';
        const age = (b.match(/ age=(\d+)/) || [])[1];
        console.log(`  ${C.dim}name=${name} cmd=${cmd} age=${age}s${C.reset}`);
      }
    } else {
      warn(`No blocking consumer connections found. If jobs are sitting in 'wait' right now, this is the smoking gun: no worker is actually blocked-waiting on this Redis (dropped/idle connection).`);
      findings.push(`No blocked consumers: worker blocking-connection likely dropped (idle-timeout). Add TCP keepAlive / keepalive job.`);
    }
  } catch (e) {
    warn(`CLIENT LIST unavailable: ${e.message}`);
  }

  // ---- 4. Per-queue state + registered workers ----------------------------
  head('4. App queues');
  for (const name of args.queues) {
    const q = new Queue(name, { connection: connOpts(args.url) });
    try {
      const counts = await q.getJobCounts('wait', 'active', 'delayed', 'failed', 'completed', 'paused');
      const workers = await q.getWorkers().catch(() => []);
      const isPaused = await q.isPaused().catch(() => false);
      const line = `[wait=${counts.wait} active=${counts.active} delayed=${counts.delayed} failed=${counts.failed} completed=${counts.completed}]`;
      console.log(`  ${C.bold}${name}${C.reset} workersRegistered=${workers.length} paused=${isPaused} ${line}`);
      if (workers.length === 0) {
        bad(`  ${name}: 0 workers registered in Redis — nothing will consume jobs here.`);
        findings.push(`${name}: no workers registered — worker never started / crashed / on a different Redis.`);
      } else {
        ok(`  ${name}: ${workers.length} worker(s) registered`);
      }
      if (counts.wait > 0 && counts.active === 0 && workers.length > 0) {
        warn(`  ${name}: ${counts.wait} waiting with 0 active despite ${workers.length} worker(s) — snapshot; if it persists >15s the worker isn't consuming.`);
      }
      if (isPaused) { bad(`  ${name}: queue is PAUSED`); findings.push(`${name}: queue paused — resume it.`); }
    } catch (e) {
      warn(`  ${name}: inspect failed: ${e.message}`);
    } finally {
      await q.close().catch(() => {});
    }
  }

  // ---- 5. Live idle→consume test (optional) -------------------------------
  if (args.idleTest) {
    const idleMs = args.idleTest * 1000;
    head(`5. Idle→consume test (isolated queue, ${args.idleTest}s idle)`);
    const qname = 'diag-idle-consume';
    const q = new Queue(qname, { connection: connOpts(args.url) });
    let activeAt = null;
    let reconnects = 0;
    const startedWaitingAt = { t: 0 };
    const worker = new Worker(qname, async () => { /* no-op */ }, { connection: connOpts(args.url), concurrency: 1 });
    worker.on('active', () => { if (!activeAt) activeAt = Date.now(); });
    // A reconnect during the idle window is the signature of the managed-Redis
    // blocking-connection drop.
    worker.on('ioredis:close', () => { reconnects++; });
    await worker.waitUntilReady();
    await q.waitUntilReady();
    ok(`worker ready; sitting idle ${args.idleTest}s (watching blocked_clients)...`);
    const t0 = Date.now();
    // Poll blocked_clients during idle so we can see the connection drop live.
    const iv = setInterval(async () => {
      try {
        const ci = parseInfo(await client.info('clients'));
        process.stdout.write(`  ${C.dim}t+${Math.round((Date.now() - t0) / 1000)}s blocked_clients=${ci.blocked_clients}${C.reset}\r`);
      } catch { /* ignore */ }
    }, 5000);
    await new Promise((r) => setTimeout(r, idleMs));
    clearInterval(iv);
    console.log('');
    startedWaitingAt.t = Date.now();
    await q.add('probe', {}, { removeOnComplete: true, removeOnFail: true });
    // Wait up to 20s for pickup
    const deadline = Date.now() + 20_000;
    while (!activeAt && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    if (activeAt) {
      const ms = activeAt - startedWaitingAt.t;
      if (ms < 1500) ok(`consumed after idle in ${ms}ms — healthy, no idle-drop.`);
      else { warn(`consumed but slow: ${ms}ms after idle (blocking connection was likely re-established).`); findings.push(`Job pickup after idle took ${ms}ms — idle blocking-connection drop confirmed.`); }
    } else {
      bad(`NOT consumed within 20s after ${args.idleTest}s idle — reproduces the stuck-in-wait failure. This is your bug.`);
      findings.push(`Idle test reproduced stuck job: worker did not consume after ${args.idleTest}s idle.`);
    }
    await worker.close().catch(() => {});
    await q.obliterate({ force: true }).catch(() => {});
    await q.close().catch(() => {});
  }

  // ---- Verdict ------------------------------------------------------------
  head('Verdict');
  if (findings.length === 0) {
    ok('No queue-level problems detected by this run.');
  } else {
    for (const f of findings) bad(f);
  }
  await client.quit().catch(() => {});
  process.exit(findings.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
