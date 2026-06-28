import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePopupDto } from './create-popup.dto';

async function errorProps(plain: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreatePopupDto, plain);
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

const valid = {
  name: 'Welcome',
  type: 'discount',
  enabled: true,
  priority: 1,
  triggerConfig: { type: 'time_delay', value: '5' },
  frequencyConfig: { frequency: 'once_per_day' },
  targetPages: ['homepage', 'product'],
  designConfig: {
    position: 'center',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    imageUrl: 'https://cdn.shopify.com/x.png',
    showCloseButton: true,
  },
  contentConfig: {
    title: 'Get 10% off',
    couponCode: 'SAVE10',
    buttonText: 'Shop',
    buttonLink: 'https://acme.myshopify.com/sale',
  },
};

describe('CreatePopupDto (task 7.2)', () => {
  it('chấp nhận payload hợp lệ', async () => {
    expect(await errorProps(valid)).toEqual([]);
  });

  it('reject thiếu name / type', async () => {
    const props = await errorProps({ enabled: true });
    expect(props).toContain('name');
    expect(props).toContain('type');
  });

  it('reject type ngoài enum', async () => {
    expect(await errorProps({ ...valid, type: 'banner' })).toContain('type');
  });

  it('reject field thừa (forbidNonWhitelisted)', async () => {
    expect(await errorProps({ ...valid, evil: 'x' })).toContain('evil');
  });

  it('reject buttonLink không phải https (chống javascript:/http)', async () => {
    const props = await errorProps({
      ...valid,
      contentConfig: { buttonLink: 'javascript:alert(1)' },
    });
    expect(props).toContain('contentConfig');
    expect(props).toContain('buttonLink');
  });

  it('reject http (không https) buttonLink', async () => {
    const props = await errorProps({
      ...valid,
      contentConfig: { buttonLink: 'http://acme.myshopify.com' },
    });
    expect(props).toContain('buttonLink');
  });

  it('reject màu không phải hex', async () => {
    const props = await errorProps({
      ...valid,
      designConfig: { backgroundColor: 'red' },
    });
    expect(props).toContain('designConfig');
    expect(props).toContain('backgroundColor');
  });

  it('reject targetPages không phải array', async () => {
    expect(await errorProps({ ...valid, targetPages: 'homepage' })).toContain(
      'targetPages',
    );
  });

  it('reject page ngoài enum trong targetPages', async () => {
    expect(
      await errorProps({ ...valid, targetPages: ['homepage', 'checkout'] }),
    ).toContain('targetPages');
  });

  it('StripTags: bỏ thẻ HTML khỏi text field (sanitize-on-write)', () => {
    const dto = plainToInstance(CreatePopupDto, {
      ...valid,
      name: '<b>Hi</b><script>alert(1)</script>',
      contentConfig: { title: '<img src=x onerror=alert(1)>Sale' },
    });
    expect(dto.name).toBe('Hialert(1)');
    expect(dto.contentConfig?.title).toBe('Sale');
  });
});
