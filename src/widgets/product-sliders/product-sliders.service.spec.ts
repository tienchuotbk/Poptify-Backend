import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { MetafieldPublisherService } from '../common/metafield-publisher.service';
import { WidgetProjectionService } from '../common/widget-projection.service';
import { WidgetResolverService } from '../common/widget-resolver.service';
import { CreateProductSliderDto } from './dto/create-product-slider.dto';
import { ProductSliderEntity } from './product-slider.entity';
import { ProductSliderSourceType } from './product-slider.enums';
import { ProductSlidersService } from './product-sliders.service';

const SHOP_A = 'acme.myshopify.com';
const SHOP_B = 'other.myshopify.com';

const baseDto = (
  over: Partial<CreateProductSliderDto> = {},
): CreateProductSliderDto => ({
  name: 'Slider',
  sourceType: ProductSliderSourceType.Featured,
  enabled: true,
  ...over,
});

describe('ProductSlidersService (task 10.3)', () => {
  let ds: DataSource;
  let service: ProductSlidersService;
  let publish: jest.Mock;
  let getActivityState: jest.Mock;

  beforeAll(async () => {
    ds = await createTestDataSource();
  });

  afterAll(async () => {
    await ds.destroy();
  });

  beforeEach(async () => {
    await ds.getRepository(ProductSliderEntity).clear();
    publish = jest.fn().mockResolvedValue({ published: true });
    getActivityState = jest
      .fn()
      .mockResolvedValue({ appEnabled: true, startDate: null, endDate: null });
    const projection = new WidgetProjectionService(new WidgetResolverService());
    service = new ProductSlidersService(
      ds.getRepository(ProductSliderEntity),
      projection,
      { publish } as unknown as MetafieldPublisherService,
      { getActivityState } as unknown as AppSettingsService,
    );
  });

  it('create + publish key "sliders" (id=publicId, không leak field nội bộ)', async () => {
    const slider = await service.create(
      SHOP_A,
      baseDto({ sourceConfig: { productHandles: ['a', 'b'] } }),
    );
    const [shop, key, value] = publish.mock.calls[0];
    expect(shop).toBe(SHOP_A);
    expect(key).toBe('sliders');
    expect(value.sliders).toHaveLength(1);
    const projected = value.sliders[0];
    expect(projected.id).toBe(slider.publicId);
    expect(projected).not.toHaveProperty('shop');
    expect(projected).not.toHaveProperty('enabled');
    expect(projected).not.toHaveProperty('createdAt');
  });

  it('productHandles rỗng → publish graceful (không 500, projection vẫn xuất reference)', async () => {
    await expect(
      service.create(SHOP_A, baseDto({ sourceConfig: { productHandles: [] } })),
    ).resolves.toBeDefined();
    expect(publish.mock.calls[0][2].sliders[0].source).toEqual({
      productHandles: [],
    });
  });

  it('list scope theo shop; cross-shop get/update/remove → 404', async () => {
    const slider = await service.create(SHOP_A, baseDto());
    await service.create(SHOP_B, baseDto({ name: 'b' }));

    expect(await service.list(SHOP_A)).toHaveLength(1);
    await expect(service.get(SHOP_B, slider.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update(SHOP_B, slider.id, { name: 'hack' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(SHOP_B, slider.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('app_enabled=false → re-publish sliders rỗng', async () => {
    await service.create(SHOP_A, baseDto({ enabled: true }));
    publish.mockClear();
    getActivityState.mockResolvedValueOnce({
      appEnabled: false,
      startDate: null,
      endDate: null,
    });
    await service.onAppSettingsChanged({ shop: SHOP_A });
    expect(publish.mock.calls[0][2].sliders).toEqual([]);
  });
});
