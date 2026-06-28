import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TargetingDto } from './targeting.dto';

async function errorsFor(plain: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(TargetingDto, plain);
  const errors = await validate(dto, { whitelist: true });
  // flatten property paths (gồm nested)
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

describe('TargetingDto (task 6.3)', () => {
  it('chấp nhận targeting hợp lệ', async () => {
    expect(
      await errorsFor({
        deviceTarget: 'mobile',
        targetPages: ['homepage', 'product'],
        schedule: {
          startDate: '2026-07-01T00:00:00Z',
          endDate: '2026-07-31T23:59:59Z',
          timezone: 'Asia/Ho_Chi_Minh',
        },
      }),
    ).toEqual([]);
  });

  it('chấp nhận rỗng (mọi field optional)', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  it('reject deviceTarget ngoài enum', async () => {
    expect(await errorsFor({ deviceTarget: 'tablet' })).toContain(
      'deviceTarget',
    );
  });

  it('reject page ngoài enum trong targetPages', async () => {
    expect(
      await errorsFor({ targetPages: ['homepage', 'checkout'] }),
    ).toContain('targetPages');
  });

  it('reject schedule.startDate không phải ISO instant (nested)', async () => {
    const props = await errorsFor({ schedule: { startDate: '2026-07-01' } });
    expect(props).toContain('schedule');
    expect(props).toContain('startDate');
  });
});
