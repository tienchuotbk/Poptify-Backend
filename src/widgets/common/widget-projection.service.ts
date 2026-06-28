import { Injectable } from '@nestjs/common';
import {
  AppActivityState,
  WidgetResolverService,
} from './widget-resolver.service';

/** Widget tối thiểu để project: phải có cờ `enabled`. */
export interface ProjectableWidget {
  enabled: boolean;
}

/**
 * Dựng "bản chiếu" công khai cho metafield delivery (task 6.6 / spec F5).
 *
 * - App inactive (gate `app_enabled` + schedule qua `WidgetResolverService`) →
 *   projection RỖNG cho mọi key.
 * - Chỉ widget `enabled === true` được xuất.
 * - `toPublic` là whitelist mapper do mỗi module (Popup/Bar/Slider) cung cấp —
 *   chỉ chọn field render, KHÔNG đẩy `id`/`shopId`/timestamps/PII (allow-list).
 */
@Injectable()
export class WidgetProjectionService {
  constructor(private readonly resolver: WidgetResolverService) {}

  project<E extends ProjectableWidget, P>(
    state: AppActivityState,
    widgets: E[],
    toPublic: (widget: E) => P,
    now?: Date,
  ): P[] {
    if (!this.resolver.isAppActive(state, now)) {
      return [];
    }
    return widgets.filter((w) => w.enabled).map(toPublic);
  }
}
