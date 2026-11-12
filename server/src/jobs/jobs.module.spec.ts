/**
 * Both `main.ts` and `main.worker.ts` bootstrap AppModule, so an
 * unconditional `ScheduleModule.forRoot()` ran every @Cron twice — once per
 * PM2 process. Harmless duplication for most jobs, but the Instagram token
 * refresh writes back what it fetched, so the loser of the race could persist
 * a token the winner had already rotated away.
 */

/** Load JobsModule fresh under a given flag and report its imports. */
function importsUnder(flag: string | undefined): unknown[] {
  const previous = process.env.BULLMQ_WORKER_ENABLED;
  if (flag === undefined) delete process.env.BULLMQ_WORKER_ENABLED;
  else process.env.BULLMQ_WORKER_ENABLED = flag;

  let imports: unknown[] = [];
  jest.isolateModules(() => {
    // `isolateModules` needs a synchronous load to get a fresh copy of the
    // module under the env var set above; a static import is evaluated once.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JobsModule } = require('./jobs.module') as {
      JobsModule: object;
    };
    imports =
      (Reflect.getMetadata('imports', JobsModule) as unknown[] | undefined) ??
      [];
  });

  if (previous === undefined) delete process.env.BULLMQ_WORKER_ENABLED;
  else process.env.BULLMQ_WORKER_ENABLED = previous;
  return imports;
}

/**
 * `ScheduleModule.forRoot()` returns a DynamicModule wrapping its own class.
 * Matched by name rather than identity: `jest.isolateModules` re-evaluates
 * @nestjs/schedule, so the class object differs between loads.
 */
function registersScheduler(imports: unknown[]): boolean {
  return imports.some((entry) => {
    const candidate =
      (entry as { module?: { name?: string } } | undefined)?.module ?? entry;
    return (
      (candidate as { name?: string } | undefined)?.name === 'ScheduleModule'
    );
  });
}

describe('JobsModule scheduler registration', () => {
  it('registers the scheduler in the worker', () => {
    expect(registersScheduler(importsUnder('true'))).toBe(true);
  });

  it('does NOT register it in the API process', () => {
    // Otherwise every cron fires twice a day instead of once.
    expect(registersScheduler(importsUnder('false'))).toBe(false);
  });

  it('registers it when the flag is unset, for single-process development', () => {
    expect(registersScheduler(importsUnder(undefined))).toBe(true);
  });

  it('keeps the other job modules in both processes', () => {
    // Only the scheduler is conditional; the queue wiring is not.
    expect(importsUnder('false').length).toBe(importsUnder('true').length - 1);
  });
});
