import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { MetafieldPublisherService } from '../common/metafield-publisher.service';
import { WidgetProjectionService } from '../common/widget-projection.service';
import { WidgetResolverService } from '../common/widget-resolver.service';
import { AnnouncementBarEntity } from './announcement-bar.entity';
import { AnnouncementBarType } from './announcement-bar.enums';
import { AnnouncementBarsService } from './announcement-bars.service';
import { CreateAnnouncementBarDto } from './dto/create-announcement-bar.dto';

const SHOP_A = 'acme.myshopify.com';
const SHOP_B = 'other.myshopify.com';

const baseDto = (
  over: Partial<CreateAnnouncementBarDto> = {},
): CreateAnnouncementBarDto => ({
  name: 'Bar',
  type: AnnouncementBarType.Simple,
  enabled: true,
  ...over,
});

describe('AnnouncementBarsService (task 9.3)', () => {
  let ds: DataSource;
  let service: AnnouncementBarsService;
  let publish: jest.Mock;
  let getActivityState: jest.Mock;

  beforeAll(async () => {
    ds = await createTestDataSource();
  });

  afterAll(async () => {
    await ds.destroy();
  });

  beforeEach(async () => {
    await ds.getRepository(AnnouncementBarEntity).clear();
    publish = jest.fn().mockResolvedValue({ published: true });
    getActivityState = jest
      .fn()
      .mockResolvedValue({ appEnabled: true, startDate: null, endDate: null });
    const projection = new WidgetProjectionService(new WidgetResolverService());
    service = new AnnouncementBarsService(
      ds.getRepository(AnnouncementBarEntity),
      projection,
      { publish } as unknown as MetafieldPublisherService,
      { getActivityState } as unknown as AppSettingsService,
    );
  });

  it('create + publish key "bars" (id=publicId, không leak field nội bộ)', async () => {
    const bar = await service.create(SHOP_A, baseDto());
    expect(bar.publicId).toBeDefined();

    const [shop, key, value] = publish.mock.calls[0];
    expect(shop).toBe(SHOP_A);
    expect(key).toBe('bars');
    expect(value.bars).toHaveLength(1);
    const projected = value.bars[0];
    expect(projected.id).toBe(bar.publicId);
    expect(projected).not.toHaveProperty('shop');
    expect(projected).not.toHaveProperty('enabled');
    expect(projected).not.toHaveProperty('createdAt');
    expect(projected).not.toHaveProperty('updatedAt');
  });

  it('list scope theo shop; cross-shop get/update/remove → 404', async () => {
    const bar = await service.create(SHOP_A, baseDto());
    await service.create(SHOP_B, baseDto({ name: 'b' }));

    expect(await service.list(SHOP_A)).toHaveLength(1);
    await expect(service.get(SHOP_B, bar.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update(SHOP_B, bar.id, { name: 'hack' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(SHOP_B, bar.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('app_enabled=false → re-publish bars rỗng', async () => {
    await service.create(SHOP_A, baseDto({ enabled: true }));
    publish.mockClear();
    getActivityState.mockResolvedValueOnce({
      appEnabled: false,
      startDate: null,
      endDate: null,
    });
    await service.onAppSettingsChanged({ shop: SHOP_A });
    expect(publish.mock.calls[0][2].bars).toEqual([]);
  });
});
