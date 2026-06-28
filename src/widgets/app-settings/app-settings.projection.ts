import { AppSettingsEntity } from './app-settings.entity';

/**
 * Shape công khai của app settings trong metafield `settings` (đọc bởi theme
 * extension qua Liquid). Cung cấp gate tổng + targeting + schedule để client
 * quyết định render. KHÔNG phơi `id`/`shop`/timestamps.
 */
export interface PublicAppSettings {
  appEnabled: boolean;
  deviceTarget: string;
  globalPageTarget: string;
  schedule: {
    startDate: string | null;
    endDate: string | null;
    timezone: string | null;
  };
}

export function toPublicAppSettings(s: AppSettingsEntity): PublicAppSettings {
  return {
    appEnabled: s.appEnabled,
    deviceTarget: s.deviceTarget,
    globalPageTarget: s.globalPageTarget,
    schedule: {
      startDate: s.startDate ? s.startDate.toISOString() : null,
      endDate: s.endDate ? s.endDate.toISOString() : null,
      timezone: s.timezone ?? null,
    },
  };
}
