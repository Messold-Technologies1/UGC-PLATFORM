/**
 * Shared schedule for the DB-truth backstop reconcile crons (watermark pipeline,
 * Instagram reel-mirror, Instagram reel-cache sync).
 *
 * These are the rare CATCH-ALL for the truly-abandoned case: a job that Redis
 * dropped or a process that crashed mid-work, which no one is actively looking
 * at. The common cases are handled without this timer:
 *   - the primary BullMQ path (worker + delayed recheck) recovers most failures
 *     within ~2 min;
 *   - user-facing paths recover on read — e.g. WatermarkQueueService
 *     .redriveOnReadIfOwed re-drives an owed preview the moment a brand opens the
 *     order, and a creator's "Refresh" re-drives a stuck reel sync — at zero
 *     extra database wake, because the read already woke the compute.
 *
 * So this only needs to sweep for work that nothing else will ever trigger.
 * Hourly (on the hour) is plenty, and all three crons share this ONE expression
 * so they fire on the same tick: the database wakes once, runs every sweep, then
 * gets a long clean idle window and can autosuspend (Neon serverless compute
 * bills for awake-time, not data). Staggered or more-frequent schedules poke the
 * compute around the clock and defeat autosuspend — the reason this was
 * consolidated. Keep them identical and do not speed one up to "recover quicker";
 * recovery speed for anything a user cares about comes from the on-read paths,
 * not from this backstop.
 *
 * Six-field expression (second minute hour dom month dow): second 0, minute 0 —
 * i.e. once an hour, on the hour.
 */
export const RECONCILE_BACKSTOP_CRON = '0 0 * * * *';
