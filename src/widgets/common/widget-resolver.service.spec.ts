import { WidgetResolverService } from './widget-resolver.service';

describe('WidgetResolverService (task 6.4)', () => {
  const resolver = new WidgetResolverService();
  const start = '2026-07-01T00:00:00Z';
  const end = '2026-07-31T00:00:00Z';

  it('app_enabled=false → luôn inactive', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: false, startDate: null, endDate: null },
        new Date('2026-07-15T00:00:00Z'),
      ),
    ).toBe(false);
  });

  it('null schedule + app bật → always-on', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: true, startDate: null, endDate: null },
        new Date('2000-01-01T00:00:00Z'),
      ),
    ).toBe(true);
  });

  it('now == start → active (nửa mở [start,end))', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: true, startDate: start, endDate: end },
        new Date(start),
      ),
    ).toBe(true);
  });

  it('now == end → inactive', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: true, startDate: start, endDate: end },
        new Date(end),
      ),
    ).toBe(false);
  });

  it('trong khoảng → active', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: true, startDate: start, endDate: end },
        new Date('2026-07-15T00:00:00Z'),
      ),
    ).toBe(true);
  });

  it('trước start → inactive', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: true, startDate: start, endDate: end },
        new Date('2026-06-30T23:59:59Z'),
      ),
    ).toBe(false);
  });

  it('end < start (window không hợp lệ) → inactive', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: true, startDate: end, endDate: start },
        new Date('2026-07-15T00:00:00Z'),
      ),
    ).toBe(false);
  });

  it('chỉ có start (không end) → active sau start', () => {
    expect(
      resolver.isAppActive(
        { appEnabled: true, startDate: start, endDate: null },
        new Date('2030-01-01T00:00:00Z'),
      ),
    ).toBe(true);
  });

  it('so sánh theo absolute instant — Date object cũng được', () => {
    expect(
      resolver.isAppActive(
        {
          appEnabled: true,
          startDate: new Date(start),
          endDate: new Date(end),
        },
        new Date('2026-07-10T00:00:00Z'),
      ),
    ).toBe(true);
  });
});
