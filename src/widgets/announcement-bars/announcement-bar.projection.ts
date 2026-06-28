import { AnnouncementBarEntity } from './announcement-bar.entity';

/**
 * Shape công khai của bar trong metafield `bars` (theme extension đọc qua Liquid).
 * `id` = `publicId` (uuid). KHÔNG phơi PK numeric/`shop`/timestamps/`schemaVersion`.
 */
export interface PublicAnnouncementBar {
  id: string;
  name: string;
  type: string;
  priority: number;
  position: string;
  sticky: boolean;
  content: unknown;
  style: unknown;
  visibility: unknown;
}

export function toPublicAnnouncementBar(
  b: AnnouncementBarEntity,
): PublicAnnouncementBar {
  return {
    id: b.publicId,
    name: b.name,
    type: b.type,
    priority: b.priority,
    position: b.position,
    sticky: b.sticky,
    content: b.contentConfig ?? null,
    style: b.styleConfig ?? null,
    visibility: b.visibilityRules ?? null,
  };
}
