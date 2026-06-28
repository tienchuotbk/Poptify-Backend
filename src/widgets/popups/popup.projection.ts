import { PopupEntity } from './popup.entity';

/**
 * Shape công khai của popup trong metafield (đọc bởi theme extension qua Liquid).
 * Whitelist allow-list: chỉ field render. `id` = `publicId` (uuid opaque) làm khóa
 * ổn định cho client cap frequency — KHÔNG phơi PK numeric nội bộ (tránh leak
 * count/ordering), `shop`, `enabled`, `schemaVersion`, timestamps (spec F5).
 */
export interface PublicPopup {
  id: string;
  name: string;
  type: string;
  priority: number;
  trigger: unknown;
  frequency: unknown;
  targetPages: string[] | null;
  design: unknown;
  content: unknown;
}

export function toPublicPopup(p: PopupEntity): PublicPopup {
  return {
    id: p.publicId,
    name: p.name,
    type: p.type,
    priority: p.priority,
    trigger: p.triggerConfig ?? null,
    frequency: p.frequencyConfig ?? null,
    targetPages: p.targetPages ?? null,
    design: p.designConfig ?? null,
    content: p.contentConfig ?? null,
  };
}
