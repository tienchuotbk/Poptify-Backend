import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { APP_SETTINGS_CHANGED } from '../common/app-settings-changed.event';
import { DeviceTarget } from '../common/dto/targeting.dto';
import { MetafieldPublisherService } from '../common/metafield-publisher.service';
import { AppSettingsEntity } from './app-settings.entity';
import { AppSettingsService } from './app-settings.service';

const SHOP = 'acme.myshopify.com';

describe('AppSettingsService (task 8.1/8.2)', () => {
  let ds: DataSource;
  let service: AppSettingsService;
  let publish: jest.Mock;
  let emitAsync: jest.Mock;

  beforeAll(async () => {
    ds = await createTestDataSource();
  });

  afterAll(async () => {
    await ds.destroy();
  });

  beforeEach(async () => {
    await ds.getRepository(AppSettingsEntity).clear();
    publish = jest.fn().mockResolvedValue({ published: true });
    emitAsync = jest.fn().mockResolvedValue([]);
    service = new AppSettingsService(
      ds.getRepository(AppSettingsEntity),
      { publish } as unknown as MetafieldPublisherService,
      { emitAsync } as unknown as EventEmitter2,
    );
  });

  it('getOrCreate tạo default lúc first-access (appEnabled=false, target all)', async () => {
    const s = await service.getOrCreate(SHOP);
    expect(s.appEnabled).toBe(false);
    expect(s.deviceTarget).toBe(DeviceTarget.All);
    expect(s.globalPageTarget).toBe('all');
  });

  it('getOrCreate idempotent — không tạo 2 row', async () => {
    const a = await service.getOrCreate(SHOP);
    const b = await service.getOrCreate(SHOP);
    expect(b.id).toBe(a.id);
    expect(await ds.getRepository(AppSettingsEntity).count()).toBe(1);
  });

  it('update đổi field + publish "settings" + emit event', async () => {
    const updated = await service.update(SHOP, {
      appEnabled: true,
      deviceTarget: DeviceTarget.Mobile,
    });
    expect(updated.appEnabled).toBe(true);
    expect(updated.deviceTarget).toBe(DeviceTarget.Mobile);

    expect(publish).toHaveBeenCalledWith(
      SHOP,
      'settings',
      expect.objectContaining({ appEnabled: true, deviceTarget: 'mobile' }),
    );
    expect(emitAsync).toHaveBeenCalledWith(
      APP_SETTINGS_CHANGED,
      expect.objectContaining({ shop: SHOP }),
    );
  });

  it('update schedule map sang startDate/endDate/timezone', async () => {
    const updated = await service.update(SHOP, {
      schedule: {
        startDate: '2026-07-01T00:00:00Z',
        endDate: '2026-07-31T00:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      },
    });
    expect(updated.startDate?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(updated.endDate?.toISOString()).toBe('2026-07-31T00:00:00.000Z');
    expect(updated.timezone).toBe('Asia/Ho_Chi_Minh');
  });

  it('getActivityState phản ánh appEnabled + dates', async () => {
    await service.update(SHOP, { appEnabled: true });
    const state = await service.getActivityState(SHOP);
    expect(state.appEnabled).toBe(true);
  });

  it('getOrCreate: race unique-violation khi save → re-fetch (không tạo 2 row)', async () => {
    const existing = { id: 7, shop: SHOP } as AppSettingsEntity;
    const repo = {
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce(null) // check đầu: chưa có
        .mockResolvedValueOnce(existing), // re-fetch sau conflict
      create: jest.fn().mockReturnValue({ shop: SHOP }),
      save: jest
        .fn()
        .mockRejectedValueOnce(
          new QueryFailedError(
            'INSERT',
            undefined,
            new Error('UNIQUE constraint failed: app_settings.shop'),
          ),
        ),
    } as unknown as Repository<AppSettingsEntity>;
    const raced = new AppSettingsService(
      repo,
      { publish } as unknown as MetafieldPublisherService,
      { emitAsync } as unknown as EventEmitter2,
    );

    const result = await raced.getOrCreate(SHOP);
    expect(result).toBe(existing);
    expect((repo.findOneBy as jest.Mock).mock.calls).toHaveLength(2);
  });
});
