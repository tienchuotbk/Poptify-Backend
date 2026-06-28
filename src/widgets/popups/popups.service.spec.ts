import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { MetafieldPublisherService } from '../common/metafield-publisher.service';
import { WidgetProjectionService } from '../common/widget-projection.service';
import { WidgetResolverService } from '../common/widget-resolver.service';
import { CreatePopupDto } from './dto/create-popup.dto';
import { PopupEntity } from './popup.entity';
import { PopupType } from './popup.enums';
import { PopupsService } from './popups.service';

const SHOP_A = 'acme.myshopify.com';
const SHOP_B = 'other.myshopify.com';

const baseDto = (over: Partial<CreatePopupDto> = {}): CreatePopupDto => ({
  name: 'Welcome',
  type: PopupType.Discount,
  enabled: true,
  ...over,
});

describe('PopupsService (task 7.3/7.4)', () => {
  let ds: DataSource;
  let service: PopupsService;
  let publish: jest.Mock;
  let getActivityState: jest.Mock;

  beforeAll(async () => {
    ds = await createTestDataSource();
  });

  afterAll(async () => {
    await ds.destroy();
  });

  beforeEach(async () => {
    await ds.getRepository(PopupEntity).clear();
    publish = jest.fn().mockResolvedValue({ published: true });
    getActivityState = jest
      .fn()
      .mockResolvedValue({ appEnabled: true, startDate: null, endDate: null });
    const projection = new WidgetProjectionService(new WidgetResolverService());
    service = new PopupsService(
      ds.getRepository(PopupEntity),
      projection,
      { publish } as unknown as MetafieldPublisherService,
      { getActivityState } as unknown as AppSettingsService,
    );
  });

  it('create lưu popup + publish key "popups" với projection (không leak field nội bộ)', async () => {
    const popup = await service.create(SHOP_A, baseDto());
    expect(popup.id).toBeDefined();
    expect(popup.shop).toBe(SHOP_A);

    expect(publish).toHaveBeenCalledTimes(1);
    const [shop, key, value] = publish.mock.calls[0];
    expect(shop).toBe(SHOP_A);
    expect(key).toBe('popups');
    expect(value.popups).toHaveLength(1);
    const projected = value.popups[0];
    expect(projected).not.toHaveProperty('shop');
    expect(projected).not.toHaveProperty('enabled');
    expect(projected).not.toHaveProperty('createdAt');
    expect(projected.name).toBe('Welcome');
    // id công khai = publicId (uuid string), KHÔNG phải PK numeric nội bộ
    expect(typeof projected.id).toBe('string');
    expect(projected.id).toBe(popup.publicId);
    expect(projected.id).not.toBe(popup.id);
  });

  it('popup disabled bị loại khỏi projection', async () => {
    await service.create(SHOP_A, baseDto({ enabled: false }));
    const value = publish.mock.calls[0][2];
    expect(value.popups).toEqual([]);
  });

  it('list chỉ trả popup của shop hiện tại', async () => {
    await service.create(SHOP_A, baseDto({ name: 'a' }));
    await service.create(SHOP_B, baseDto({ name: 'b' }));
    const listA = await service.list(SHOP_A);
    expect(listA).toHaveLength(1);
    expect(listA[0].name).toBe('a');
  });

  it('get cross-shop → 404', async () => {
    const popup = await service.create(SHOP_A, baseDto());
    await expect(service.get(SHOP_B, popup.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update cross-shop → 404; update own → đổi field + re-publish', async () => {
    const popup = await service.create(SHOP_A, baseDto());
    publish.mockClear();

    await expect(
      service.update(SHOP_B, popup.id, { name: 'hack' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const updated = await service.update(SHOP_A, popup.id, { name: 'renamed' });
    expect(updated.name).toBe('renamed');
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('enable/disable qua update đổi đúng', async () => {
    const popup = await service.create(SHOP_A, baseDto({ enabled: true }));
    const disabled = await service.update(SHOP_A, popup.id, { enabled: false });
    expect(disabled.enabled).toBe(false);
  });

  it('remove cross-shop → 404; remove own → xóa + re-publish', async () => {
    const popup = await service.create(SHOP_A, baseDto());
    publish.mockClear();

    await expect(service.remove(SHOP_B, popup.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await service.remove(SHOP_A, popup.id);
    await expect(service.get(SHOP_A, popup.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('publish lỗi KHÔNG làm fail CRUD (DB là SoT)', async () => {
    publish.mockRejectedValueOnce(new Error('admin down'));
    await expect(service.create(SHOP_A, baseDto())).resolves.toBeDefined();
  });

  it('app_enabled=false (từ AppSettings) → re-publish projection rỗng', async () => {
    await service.create(SHOP_A, baseDto({ enabled: true }));
    publish.mockClear();
    getActivityState.mockResolvedValueOnce({
      appEnabled: false,
      startDate: null,
      endDate: null,
    });

    await service.onAppSettingsChanged({ shop: SHOP_A });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][2].popups).toEqual([]);
  });
});
