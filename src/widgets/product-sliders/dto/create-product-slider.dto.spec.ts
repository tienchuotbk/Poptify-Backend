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
  it('chấp nhận featured (productHandles) hợp lệ', async () => {
    expect(
      await errorProps({
        name: 'New arrivals',
        sourceType: 'featured',
        enabled: true,
        sourceConfig: { productHandles: ['cool-shirt', 'nice-hat'] },
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
        sourceConfig: { collectionHandle: 'summer-sale' },
      }),
    ).toEqual([]);
  });

  it('reject handle không hợp lệ (chữ hoa/khoảng trắng/gid)', async () => {
    const props = await errorProps({
      name: 'x',
      sourceType: 'featured',
      sourceConfig: { productHandles: ['gid://shopify/Product/1'] },
    });
    expect(props).toContain('productHandles');
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

  it('reject productHandles > 50', async () => {
    const handles = Array.from({ length: 51 }, function (_v, i) {
      return 'p' + i;
    });
    expect(
      await errorProps({
        name: 'x',
        sourceType: 'featured',
        sourceConfig: { productHandles: handles },
      }),
    ).toContain('productHandles');
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
