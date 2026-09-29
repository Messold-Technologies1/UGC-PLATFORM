import { Logger } from '@nestjs/common';
import { NotificationBootstrapService } from './notifications-bootstrap.service';

describe('NotificationBootstrapService', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('syncs the event registry before importing templates', async () => {
    const order: string[] = [];
    const registrySync = {
      sync: jest.fn(() => {
        order.push('sync');
        return Promise.resolve({ upserted: 31, deprecated: 0 });
      }),
    };
    const templateImport = {
      run: jest.fn(() => {
        order.push('import');
        return Promise.resolve({ templates: 37, linked: 29, schedules: 36 });
      }),
    };

    await new NotificationBootstrapService(
      registrySync as never,
      templateImport as never,
    ).onModuleInit();

    // Templates link to events by key, so the event rows have to exist first.
    expect(order).toEqual(['sync', 'import']);
  });

  it('does not import templates when the registry sync fails', async () => {
    const registrySync = {
      sync: jest.fn().mockRejectedValue(new Error('db down')),
    };
    const templateImport = { run: jest.fn() };

    await expect(
      new NotificationBootstrapService(
        registrySync as never,
        templateImport as never,
      ).onModuleInit(),
    ).rejects.toThrow('db down');

    expect(templateImport.run).not.toHaveBeenCalled();
  });

  it('keeps booting when the template import fails', async () => {
    const registrySync = {
      sync: jest.fn().mockResolvedValue({ upserted: 31, deprecated: 0 }),
    };
    const templateImport = {
      run: jest.fn().mockRejectedValue(new Error('bad handlebars')),
    };

    // A malformed .hbs must not take the API down: the renderer still falls
    // back to the files on disk, so sending keeps working.
    await expect(
      new NotificationBootstrapService(
        registrySync as never,
        templateImport as never,
      ).onModuleInit(),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });
});
