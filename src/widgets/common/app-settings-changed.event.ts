/**
 * Event phát khi Global App Settings của 1 shop thay đổi (task 8.2).
 * Các widget module (Popup/Bar/Slider) nghe event này để re-publish metafield
 * theo state mới (vd `app_enabled=false` → publish rỗng). Decouple: AppSettings
 * KHÔNG import widget module (tránh circular dep).
 */
export const APP_SETTINGS_CHANGED = 'app-settings.changed';

export class AppSettingsChangedEvent {
  constructor(public readonly shop: string) {}
}
