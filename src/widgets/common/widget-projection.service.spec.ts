import { WidgetProjectionService } from './widget-projection.service';
import { WidgetResolverService } from './widget-resolver.service';

interface FakeWidget {
  id: number;
  shopId: number;
  enabled: boolean;
  name: string;
  createdAt: Date;
}

const toPublic = (w: FakeWidget): { name: string } => ({ name: w.name });

describe('WidgetProjectionService (task 6.6)', () => {
  const service = new WidgetProjectionService(new WidgetResolverService());
  const now = new Date('2026-07-15T00:00:00Z');
  const widgets: FakeWidget[] = [
    { id: 1, shopId: 9, enabled: true, name: 'a', createdAt: now },
    { id: 2, shopId: 9, enabled: false, name: 'b', createdAt: now },
    { id: 3, shopId: 9, enabled: true, name: 'c', createdAt: now },
  ];

  it('app_enabled=false → projection rỗng', () => {
    expect(
      service.project(
        { appEnabled: false, startDate: null, endDate: null },
        widgets,
        toPublic,
        now,
      ),
    ).toEqual([]);
  });

  it('schedule ngoài khoảng → projection rỗng', () => {
    expect(
      service.project(
        {
          appEnabled: true,
          startDate: '2026-08-01T00:00:00Z',
          endDate: '2026-08-31T00:00:00Z',
        },
        widgets,
        toPublic,
        now,
      ),
    ).toEqual([]);
  });

  it('chỉ xuất widget enabled=true', () => {
    const out = service.project(
      { appEnabled: true, startDate: null, endDate: null },
      widgets,
      toPublic,
      now,
    );
    expect(out).toEqual([{ name: 'a' }, { name: 'c' }]);
  });

  it('không leak field nội bộ (id/shopId/timestamps) — chỉ field whitelist', () => {
    const out = service.project(
      { appEnabled: true, startDate: null, endDate: null },
      widgets,
      toPublic,
      now,
    );
    for (const item of out) {
      expect(item).not.toHaveProperty('id');
      expect(item).not.toHaveProperty('shopId');
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('enabled');
    }
  });
});
