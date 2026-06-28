import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductSliderDto } from './create-product-slider.dto';

async function errorProps(plain: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateProductSliderDto, plain);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const props: string[] = [];
  const walk = (errs: typeof errors): void => {
    for (const e of errs) {
      props.push(e.property);
      if (e.children?.length) walk(e.children);
    }
  };
  walk(errors);
  return props;
}

describe('CreateProductSliderDto (task 10.2)', () => {
  it('chấp nhận featured (productIds) hợp lệ', async () => {
    expect(
      await errorProps({
        name: 'New arrivals',
        sourceType: 'featured',
        enabled: true,
        sourceConfig: { productIds: ['gid://shopify/Product/1', '2'] },
        layoutConfig: { desktopItems: 4, tabletItems: 2, mobileItems: 1 },
        behaviorConfig: { autoplay: true, autoplaySpeed: 3000 },
        displayConfig: { showImage: true, showPrice: true },
        placementConfig: {
          targetPages: ['product'],
          placementPosition: 'below_product_description',
        },
      }),
    ).toEqual([]);
  });

  it('chấp nhận collection hợp lệ', async () => {
    expect(
      await errorProps({
        name: 'Coll',
        sourceType: 'collection',
        sourceConfig: { collectionId: 'gid://shopify/Collection/9' },
      }),
    ).toEqual([]);
  });

  it('reject best_sellers (đã cắt — ngoài enum)', async () => {
    expect(
      await errorProps({ name: 'x', sourceType: 'best_sellers' }),
    ).toContain('sourceType');
  });

  it('reject thiếu name/sourceType + field thừa', async () => {
    const props = await errorProps({ enabled: true, evil: 1 });
    expect(props).toContain('name');
    expect(props).toContain('sourceType');
    expect(props).toContain('evil');
  });

  it('reject layout item ngoài [1,12]', async () => {
    expect(
      await errorProps({
        name: 'x',
        sourceType: 'featured',
        layoutConfig: { desktopItems: 13 },
      }),
    ).toContain('desktopItems');
    expect(
      await errorProps({
        name: 'x',
        sourceType: 'featured',
        layoutConfig: { mobileItems: 0 },
      }),
    ).toContain('mobileItems');
  });

  it('reject productIds > 50', async () => {
    const ids = Array.from({ length: 51 }, function (_v, i) {
      return String(i);
    });
    expect(
      await errorProps({
        name: 'x',
        sourceType: 'featured',
        sourceConfig: { productIds: ids },
      }),
    ).toContain('productIds');
  });

  it('reject customSelector chứa ký tự nguy hiểm', async () => {
    const props = await errorProps({
      name: 'x',
      sourceType: 'featured',
      placementConfig: {
        placementPosition: 'custom_selector',
        customSelector: '<script>',
      },
    });
    expect(props).toContain('customSelector');
  });
});
