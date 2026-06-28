import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAnnouncementBarDto } from './create-announcement-bar.dto';

async function errorProps(plain: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateAnnouncementBarDto, plain);
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

describe('CreateAnnouncementBarDto (task 9.2)', () => {
  it('chấp nhận simple bar hợp lệ', async () => {
    expect(
      await errorProps({
        name: 'Free shipping',
        type: 'simple',
        enabled: true,
        position: 'top',
        contentConfig: {
          text: 'Free shipping over $50',
          buttonText: 'Shop',
          buttonLink: 'https://acme.myshopify.com',
        },
        styleConfig: { backgroundColor: '#000000', textColor: '#ffffff' },
        visibilityRules: { deviceTarget: 'all', targetPages: ['homepage'] },
      }),
    ).toEqual([]);
  });

  it('chấp nhận countdown + free_shipping_progress', async () => {
    expect(
      await errorProps({
        name: 'C',
        type: 'countdown',
        contentConfig: {
          text: 'Sale ends',
          endDate: '2026-07-01T00:00:00Z',
          expiredMessage: 'Ended',
        },
      }),
    ).toEqual([]);
    expect(
      await errorProps({
        name: 'F',
        type: 'free_shipping_progress',
        contentConfig: { goalAmount: 50, progressText: 'x', successText: 'y' },
      }),
    ).toEqual([]);
  });

  it('reject thiếu name/type', async () => {
    const props = await errorProps({ enabled: true });
    expect(props).toContain('name');
    expect(props).toContain('type');
  });

  it('reject type / position ngoài enum', async () => {
    expect(await errorProps({ name: 'x', type: 'ticker' })).toContain('type');
    expect(
      await errorProps({ name: 'x', type: 'simple', position: 'middle' }),
    ).toContain('position');
  });

  it('reject field thừa', async () => {
    expect(await errorProps({ name: 'x', type: 'simple', evil: 1 })).toContain(
      'evil',
    );
  });

  it('reject buttonLink non-https / màu sai / goalAmount âm / endDate sai', async () => {
    expect(
      await errorProps({
        name: 'x',
        type: 'simple',
        contentConfig: { buttonLink: 'http://x.com' },
      }),
    ).toContain('buttonLink');
    expect(
      await errorProps({
        name: 'x',
        type: 'simple',
        styleConfig: { backgroundColor: 'black' },
      }),
    ).toContain('backgroundColor');
    expect(
      await errorProps({
        name: 'x',
        type: 'free_shipping_progress',
        contentConfig: { goalAmount: -5 },
      }),
    ).toContain('goalAmount');
    expect(
      await errorProps({
        name: 'x',
        type: 'countdown',
        contentConfig: { endDate: '2026-07-01' },
      }),
    ).toContain('endDate');
  });
});
