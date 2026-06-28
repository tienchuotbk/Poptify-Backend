import { Injectable } from '@nestjs/common';

/** Input tối thiểu để quyết định app có đang "active" hay không. */
export interface AppActivityState {
  appEnabled: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

function toTime(value?: string | Date | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Service THUẦN (không I/O) quyết định widget có được serve không (task 6.4).
 * Gate gồm: `app_enabled` + schedule active-window. So sánh theo **absolute
 * instant** (UTC); `timezone` chỉ là metadata cho client render (spec F7/Q10).
 *
 * Window là nửa mở `[start, end)`: now==start → active, now==end → inactive.
 * `start`/`end` null → không giới hạn phía đó (null cả hai = always-on khi app bật).
 * `end < start` (window không hợp lệ) → inactive.
 *
 * Lưu ý phạm vi: device/page targeting + frequency/trigger là client-side concern
 * (spec F8) → KHÔNG xử lý ở đây.
 */
@Injectable()
export class WidgetResolverService {
  isAppActive(state: AppActivityState, now: Date = new Date()): boolean {
    if (!state.appEnabled) {
      return false;
    }

    const start = toTime(state.startDate);
    const end = toTime(state.endDate);
    const t = now.getTime();

    if (start !== null && end !== null && end < start) {
      return false; // window không hợp lệ
    }
    if (start !== null && t < start) {
      return false; // chưa tới giờ bật
    }
    if (end !== null && t >= end) {
      return false; // đã hết hạn (nửa mở)
    }
    return true;
  }
}
