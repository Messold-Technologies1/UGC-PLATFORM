import { TimeoutError, withTimeout } from './with-timeout';

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
  });

  it('rejects with TimeoutError when the promise is slow', async () => {
    const slow = new Promise<number>((resolve) => {
      setTimeout(() => resolve(1), 200);
    });
    await expect(withTimeout(slow, 10, 'test')).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });
});
