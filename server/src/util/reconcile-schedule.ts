/**
 * Shared schedule for the DB-truth backstop reconcile crons (watermark pipeline,
 * Instagram reel-mirror, Instagram reel-cache sync).
 *
 * All three are intentionally phase-aligned to this SAME expression so they fire
 * together: the database wakes once, runs all three sweeps, then gets a long
 * clean idle window and can autosuspend (Neon serverless compute bills for
 * awake-time, not data). Three *staggered* schedules (previously 10 / 15 / 30
 * min) poke the compute every few minutes and defeat autosuspend entirely.
 *
 * Keep them identical. Do NOT give one a faster or offset cadence to "recover
 * quicker" — that re-pins the compute awake around the clock and undoes the cost
 * saving. These are backstops for the rare case where Redis itself failed; the
 * primary BullMQ path (worker + delayed recheck) already recovers the common
 * cases within ~2 minutes, so a 30-minute floor here is safe. A stuck item
 * recovering up to ~30 min late in a genuine Redis outage is an accepted trade.
 *
 * Six-field expression (second minute hour dom month dow): second 0 of minute 0
 * and 30 — i.e. twice an hour, on the hour and half hour.
 */
export const RECONCILE_BACKSTOP_CRON = '0 */30 * * * *';
